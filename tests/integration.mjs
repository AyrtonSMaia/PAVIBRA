import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const dir=mkdtempSync(path.join(tmpdir(),'pavibra-test-'));const key=randomBytes(32).toString('hex');const base='http://127.0.0.1:10018';let logs='';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','10018'],{env:{...process.env,NODE_ENV:'production',DATA_DIR:dir,ADMIN_SETUP_KEY:key,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
async function request(url,{body,cookie,method,headers}={}){const r=await fetch(base+url,{method:method||(body?'POST':'GET'),redirect:'manual',headers:{...(body?{'Content-Type':'application/json',Origin:base}:{}),...(cookie?{Cookie:cookie}:{}),...headers},body:body?JSON.stringify(body):undefined});return {status:r.status,data:r.headers.get('content-type')?.includes('json')?await r.json():await r.text(),cookie:(r.headers.get('set-cookie')||'').split(';')[0],headers:r.headers}}
try{
 let ready=false;for(let i=0;i<80;i++){try{const r=await request('/healthz');if(r.status===200){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,200))}assert(ready,'Server failed: '+logs);
 assert.equal((await request('/api/orders')).status,401);assert.equal((await request('/api/users')).status,403);assert.equal((await request('/api/files?id=unknown')).status,403);assert.equal((await request('/api/orders',{headers:{'oai-authenticated-user-id':'fake','oai-authenticated-user-email':'ayrton.maia@pavibra.com.br'}})).status,401);
 assert.equal((await request('/materiais')).status,303);
 const pw='A-password-for-testing-only-34';
 assert.equal((await request('/api/auth',{body:{action:'setup',key:'bad',password:pw}})).status,403);
 const root=await request('/api/auth',{body:{action:'setup',key,password:pw}});assert.equal(root.status,200,JSON.stringify(root.data));const admin=root.cookie;assert(admin);
 assert.equal((await request('/api/users',{cookie:admin})).status,200);
 assert.equal((await request('/api/auth',{body:{action:'setup',key,password:pw}})).status,403);
 const create=await request('/api/users',{cookie:admin,body:{email:'visita@pavibra.com.br',name:'Visitante teste',role:'visitante',active:1,version:0}});assert.equal(create.status,200,JSON.stringify(create.data));
 const link=await request('/api/users/activation',{cookie:admin,body:{email:'visita@pavibra.com.br'}});assert.equal(link.status,200);
 const activation=await request('/api/auth',{body:{action:'activate',token:link.data.token,password:pw}});assert.equal(activation.status,200);const visitor=activation.cookie;
 assert.equal((await request('/api/auth',{body:{action:'activate',token:link.data.token,password:pw}})).status,400);
 assert.equal((await request('/api/orders',{cookie:visitor})).status,200);assert.equal((await request('/api/users',{cookie:visitor})).status,403);
 const order={id:crypto.randomUUID(),title:'Teste descartável',requester:'QA',work:'Marabá · Ponte Tocantins',priority:'Normal',status:'Rascunho',version:0,items:[{id:'1',description:'Teste',spec:'Conforme teste',category:'Postes',unit:'UN',quantity:2,received:0,price:'10'}]};
 assert.equal((await request('/api/orders',{cookie:visitor,body:order})).status,403);
 const saved=await request('/api/orders',{cookie:admin,body:order});assert.equal(saved.status,200,JSON.stringify(saved.data));const approved=await request('/api/orders',{cookie:admin,body:{...saved.data.order,status:'Aprovado'}});assert.equal(approved.status,200);assert.equal((await request('/api/orders',{cookie:admin,body:saved.data.order})).status,409);
 assert.equal((await request('/api/orders',{cookie:admin,body:order,headers:{Origin:'https://evil.example'}})).status,403);
 assert.equal((await request('/api/supply',{cookie:admin})).status,200);assert.equal((await request('/api/supply',{cookie:visitor,method:'PUT',body:{}})).status,403);
 assert.equal((await request('/api/quality',{cookie:visitor,body:{}})).status,403);
 assert.equal((await request('/api/users',{cookie:admin,body:{email:'visita@pavibra.com.br',name:'Visitante teste',role:'visitante',active:0,version:1}})).status,200);
 assert.equal((await request('/api/orders',{cookie:visitor})).status,401);
 assert.equal((await request('/api/project-manifest')).status,403);assert.equal((await request('/api/backup',{cookie:visitor})).status,403);
 const backup=await request('/api/backup',{cookie:admin});assert.equal(backup.status,200);assert.equal(backup.data.orders.length,1);
 assert.equal((await request('/api/orders',{cookie:admin})).headers.get('cache-control'),'no-store');
 const logout=await request('/sair',{cookie:admin});assert.equal(logout.status,303);assert.equal((await request('/api/users',{cookie:admin})).status,403);
 console.log('PASS: migrations, persistence, setup-once, independent sessions, invitation one-time use, visitor permissions, order approval, optimistic concurrency, CSRF, block revocation, PDF protection, backup and logout.');
}catch(e){console.error(e.message);console.error(logs.slice(-5000));process.exitCode=1}finally{server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));rmSync(dir,{recursive:true,force:true})}
