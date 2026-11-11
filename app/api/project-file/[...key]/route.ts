import {getAccess,denied} from '../../../../lib/access';
import {env} from '../../../../lib/platform';
export async function GET(req:Request,{params}:{params:Promise<{key:string[]}>}){if(!await getAccess())return denied();const key=(await params).key.join('/');if(!/^[A-Za-z0-9_./-]+\.pdf$/.test(key)||key.includes('..'))return new Response('Inválido',{status:400});const o=await env.BUCKET.get('project-pdfs/'+key);return o?new Response(o.body,{headers:{'Content-Type':'application/pdf','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}):new Response('Não encontrado',{status:404})}
