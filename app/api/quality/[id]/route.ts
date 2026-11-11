import {getAccess,originError} from '../../../../lib/access';
import {bucket,user,response,safeId,metaKey,fileKey,DOC_STATUSES} from '../../../../lib/quality-documents';

async function find(request:Request,params:Promise<{id:string}>){
  if(!await user(request))return {error:response({error:'Acesso autenticado necessário.'},401)};
  const store=bucket();if(!store)return {error:response({error:'Armazenamento indisponível.'},503)};
  const {id}=await params,item=new URL(request.url).searchParams.get('item');
  if(!safeId(id)||!safeId(item))return {error:response({error:'Documento inválido.'},400)};
  const object=await store.get(metaKey(item!,id));if(!object)return {error:response({error:'Documento não encontrado.'},404)};
  return {store,id,item:item!,object,document:await object.json<any>()};
}
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const ctx=await find(request,params);if(ctx.error)return ctx.error;
  const file=await ctx.store!.get(fileKey(ctx.item!,ctx.id!));if(!file)return response({error:'PDF não encontrado.'},404);
  const disposition=new URL(request.url).searchParams.get('download')==='1'?'attachment':'inline';
  const name=ctx.document.filename.replace(/[^a-zA-Z0-9._-]/g,'_');
  return new Response(file.body,{headers:{'Content-Type':'application/pdf','Content-Disposition':`${disposition}; filename="${name}"; filename*=UTF-8''${encodeURIComponent(ctx.document.filename)}`,'Content-Length':String(file.size),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const permission=await getAccess();if(!permission?.canEdit)return Response.json({error:'Acesso somente de consulta.'},{status:403});
  const blocked=originError(request);if(blocked)return blocked;
  const ctx=await find(request,params);if(ctx.error)return ctx.error;
  let input:any;try{input=await request.json()}catch{return response({error:'Dados inválidos.'},400)};
  if(!DOC_STATUSES.includes(input.status)||!Number.isInteger(input.version))return response({error:'Status de análise inválido.'},400);
  if(input.version!==ctx.document.version)return response({error:'O documento foi atualizado. Recarregue a lista.'},409);
  const document={...ctx.document,status:input.status,reviewNotes:String(input.reviewNotes||'').trim().slice(0,2000),reviewedAt:new Date().toISOString(),reviewedBy:await user(request),version:ctx.document.version+1};
  const written=await ctx.store!.put(metaKey(ctx.item!,ctx.id!),JSON.stringify(document),{onlyIf:{etagMatches:ctx.object!.etag},httpMetadata:{contentType:'application/json'}});
  if(!written)return response({error:'O documento foi atualizado por outro acesso. Recarregue a lista.'},409);
  return response({document});
}
