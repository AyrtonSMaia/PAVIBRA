import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,writeFileSync,renameSync,unlinkSync,existsSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
export const DATA_DIR=path.resolve(process.env.DATA_DIR||'./data');
let singleton:ReturnType<typeof openDatabase>|undefined;
function openDatabase(){
 if(process.env.NODE_ENV==='production'&&!process.env.DATA_DIR)throw Error('DATA_DIR must point to persistent storage.');
 mkdirSync(DATA_DIR,{recursive:true,mode:0o700});mkdirSync(path.join(DATA_DIR,'objects'),{recursive:true,mode:0o700});
 const raw=new DatabaseSync(path.join(DATA_DIR,'pavibra.sqlite'));
 raw.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 raw.exec('CREATE TABLE IF NOT EXISTS app_migrations(name TEXT PRIMARY KEY,hash TEXT NOT NULL);');
 for(const file of readdirSync(path.resolve('drizzle')).filter(f=>f.endsWith('.sql')).sort()){
  const sql=readFileSync(path.resolve('drizzle',file),'utf8'),hash=createHash('sha256').update(sql).digest('hex');
  const applied=raw.prepare('SELECT hash FROM app_migrations WHERE name=?').get(file) as any;
  if(applied){if(applied.hash!==hash)throw Error('Applied migration changed: '+file);continue}
  raw.exec('BEGIN IMMEDIATE');try{raw.exec(sql);raw.prepare('INSERT INTO app_migrations VALUES(?,?)').run(file,hash);raw.exec('COMMIT')}catch(e){raw.exec('ROLLBACK');throw e}
 }
 const wrap=(sql:string,args:any[]=[])=>({bind(...a:any[]){return wrap(sql,a)},async first<T=any>():Promise<T|null>{return raw.prepare(sql).get(...args) as T||null},async all(){return {results:raw.prepare(sql).all(...args)}},async run(){const r=raw.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}}},_sql:sql,_args:args});
 return {raw,prepare:wrap,async batch(statements:ReturnType<typeof wrap>[]){raw.exec('BEGIN IMMEDIATE');try{const out=statements.map(s=>{const r=raw.prepare(s._sql).run(...s._args);return {meta:{changes:Number(r.changes)}}});raw.exec('COMMIT');return out}catch(e){raw.exec('ROLLBACK');throw e}}};
}
export function database(){return singleton??=(openDatabase())}
const DB={prepare(sql:string){return database().prepare(sql)},batch(s:any[]){return database().batch(s)}};
function rowObject(key:string){return database().raw.prepare('SELECT * FROM stored_objects WHERE key=?').get(key) as any}
const BUCKET={
 async get(key:string){const o=rowObject(key);if(!o)return null;const b=readFileSync(path.join(DATA_DIR,'objects',o.file));return {body:new Uint8Array(b),size:b.length,etag:o.etag,async json<T=any>():Promise<T>{return JSON.parse(b.toString())}}},
 async put(key:string,value:any,options?:any){const expected=options?.onlyIf?.etagMatches;if(expected&&rowObject(key)?.etag!==expected)return null;const bytes=typeof value==='string'?Buffer.from(value):value instanceof ArrayBuffer?Buffer.from(value):value instanceof ReadableStream?Buffer.from(await new Response(value).arrayBuffer()):Buffer.from(value);if(bytes.length>21*1024*1024)throw Error('Arquivo excede o limite.');if(expected&&rowObject(key)?.etag!==expected)return null;const file=randomUUID(),etag=createHash('sha256').update(bytes).digest('hex');const previous=rowObject(key);const tmp=path.join(DATA_DIR,'objects',file+'.tmp');writeFileSync(tmp,bytes,{mode:0o600});renameSync(tmp,path.join(DATA_DIR,'objects',file));database().raw.prepare('INSERT INTO stored_objects(key,file,etag) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET file=excluded.file,etag=excluded.etag').run(key,file,etag);if(previous)try{unlinkSync(path.join(DATA_DIR,'objects',previous.file))}catch{}return {etag};},
 async delete(key:string){const o=rowObject(key);database().raw.prepare('DELETE FROM stored_objects WHERE key=?').run(key);if(o)try{unlinkSync(path.join(DATA_DIR,'objects',o.file))}catch{}},
 async list({prefix,limit=50,cursor=''}:{prefix:string;limit?:number;cursor?:string}){const rows=database().raw.prepare('SELECT key FROM stored_objects WHERE substr(key,1,?)=? AND key>? ORDER BY key LIMIT ?').all(prefix.length,prefix,cursor,limit+1) as {key:string}[];return {objects:rows.slice(0,limit),truncated:rows.length>limit,cursor:rows.length>limit?rows[limit-1].key:undefined}}
};
export const env={DB,BUCKET};
