import {getAccess,originError} from '../../../lib/access';
import {bucket,user,response,safeId,metaKey,fileKey,textField,validDate,DOC_TYPES,MAX_PDF} from '../../../lib/quality-documents';

export async function GET(request:Request){
  if(!await user(request))return response({error:'Acesso autenticado necessário.'},401);
  const store=bucket();if(!store)return response({error:'Armazenamento de PDFs ainda não disponível.'},503);
  const url=new URL(request.url),item=url.searchParams.get('item');
  if(!safeId(item))return response({error:'Material inválido.'},400);
  const list=await store.list({prefix:`quality-meta/${item}/`,limit:50,cursor:url.searchParams.get('cursor')||undefined});
  const documents=(await Promise.all(list.objects.map(async o=>{const m=await store.get(o.key);return m?await m.json():null}))).filter(Boolean);
  documents.sort((a:any,b:any)=>b.uploadedAt.localeCompare(a.uploadedAt));
  return response({documents,nextCursor:list.truncated?list.cursor:null});
}

export async function POST(request:Request){
  const permission=await getAccess();if(!permission?.canEdit)return Response.json({error:'Acesso somente de consulta.'},{status:403});
  const author=await user(request);if(!author)return response({error:'Acesso autenticado necessário.'},401);
  const store=bucket();if(!store)return response({error:'Armazenamento de PDFs ainda não disponível.'},503);
  const blocked=originError(request);if(blocked)return blocked;
  if(Number(request.headers.get('content-length'))>MAX_PDF+65536)return response({error:'O limite é de 20 MB por PDF.'},413);
  let form:FormData;try{form=await request.formData()}catch{return response({error:'Não foi possível ler o arquivo enviado.'},400)}
  const item=textField(form,'item',120),file=form.get('file');
  if(!safeId(item)||!(file instanceof File))return response({error:'Selecione um material e um arquivo PDF.'},400);
  if(file.size===0||file.size>MAX_PDF)return response({error:'Selecione um PDF de até 20 MB.'},413);
  if(!/\.pdf$/i.test(file.name))return response({error:'Somente arquivos PDF são permitidos.'},400);
  const bytes=await file.arrayBuffer();
  if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return response({error:'O arquivo não possui assinatura PDF válida.'},400);
  const title=textField(form,'title',160),type=textField(form,'type',80),issued=textField(form,'issued',10),expires=textField(form,'expires',10);
  if(!title||!DOC_TYPES.includes(type)||!validDate(issued)||!validDate(expires)||(issued&&expires&&expires<issued))return response({error:'Preencha o título, tipo e datas válidas.'},400);
  const id=crypto.randomUUID();
  const document={id,item,title,type,number:textField(form,'number',100),issuer:textField(form,'issuer',160),lot:textField(form,'lot',160),issued,expires,notes:textField(form,'notes',2000),itemDescription:textField(form,'itemDescription',1000),filename:file.name.slice(0,240),size:file.size,status:'Pendente de análise',uploadedAt:new Date().toISOString(),uploadedBy:author,version:1};
  try{
    await store.put(fileKey(item,id),bytes,{httpMetadata:{contentType:'application/pdf'}});
    await store.put(metaKey(item,id),JSON.stringify(document),{httpMetadata:{contentType:'application/json'}});
  }catch{await store.delete(fileKey(item,id)).catch(()=>{});return response({error:'Falha ao salvar o PDF. Tente novamente.'},500)}
  return response({document},201);
}
