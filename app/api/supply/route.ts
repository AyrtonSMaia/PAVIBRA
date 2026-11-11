import {getAccess,originError} from '../../../lib/access';
import { env } from '../../../lib/platform';
import { user,response } from '../../../lib/quality-documents';
import { SEED_STATE,stateError } from '../../../lib/supply-state';

const MAX_BYTES=1800000;
async function latest(db:any){return db.prepare('SELECT revision, payload, actor, created_at, operation FROM supply_versions ORDER BY revision DESC LIMIT 1').first()}
function expose(row:any){return {revision:row.revision,data:JSON.parse(row.payload),savedAt:row.created_at,operation:row.operation}}
export async function GET(request:Request){
  const actor=await user(request);if(!actor)return response({error:'Acesso autenticado necessário.'},401);
  if(!env.DB)return response({error:'Banco compartilhado indisponível.'},503);
  let row=await latest(env.DB);
  if(!row){const seed=SEED_STATE(),date=new Date().toISOString();const error=stateError(seed);if(error)return response({error:'Falha na base inicial: '+error},500);seed.updated=date;await env.DB.prepare('INSERT INTO supply_versions (revision, payload, actor, created_at, operation) VALUES (1, ?, ?, ?, ?) ON CONFLICT(revision) DO NOTHING').bind(JSON.stringify(seed),actor,date,'initialization').run();row=await latest(env.DB)}
  return response(expose(row));
}
export async function PUT(request:Request){
  const permission=await getAccess();if(!permission?.canEdit)return Response.json({error:'Acesso somente de consulta.'},{status:403});
  const actor=await user(request);if(!actor)return response({error:'Acesso autenticado necessário.'},401);
  if(!env.DB)return response({error:'Banco compartilhado indisponível.'},503);
  const blocked=originError(request);if(blocked)return blocked;
  if(Number(request.headers.get('content-length'))>MAX_BYTES)return response({error:'A base excede o limite permitido.'},413);
  const raw=await request.text();if(new TextEncoder().encode(raw).byteLength>MAX_BYTES)return response({error:'A base excede o limite permitido.'},413);
  let input:any;try{input=JSON.parse(raw)}catch{return response({error:'Dados inválidos.'},400)}
  if(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1)return response({error:'Revisão da base inválida.'},400);
  const error=stateError(input.data);if(error)return response({error},400);
  const date=new Date().toISOString(),data={...input.data,updated:date};
  const result=await env.DB.prepare('INSERT INTO supply_versions (revision, payload, actor, created_at, operation) SELECT ?, ?, ?, ?, ? WHERE (SELECT MAX(revision) FROM supply_versions) = ?').bind(input.expectedRevision+1,JSON.stringify(data),actor,date,String(input.operation||'edit').slice(0,100),input.expectedRevision).run();
  if(!result.meta.changes)return response({error:'A base foi alterada por outro acesso. Suas alterações não foram gravadas. Atualize os dados e confira antes de salvar novamente.'},409);
  return response({revision:input.expectedRevision+1,data,savedAt:date});
}
