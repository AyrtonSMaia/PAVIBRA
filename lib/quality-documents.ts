import { env } from './platform';
import {getAccess} from './access';

export const DOC_TYPES=['Certificado do produto','Certificado de ensaio','Relatório de ensaio','Laudo técnico','Ficha técnica','Relatório de inspeção','PIT / registro de inspeção','Outro','Projeto em PDF'];
export const DOC_STATUSES=['Pendente de análise','Em análise','Aprovado','Reprovado','Substituído'];
export const MAX_PDF=20*1024*1024;
export function response(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
export async function user(request:Request){const u=await getAccess();return u?u.email:null}
export function bucket(){return env.BUCKET}
export function safeId(value:string|null){return !!value&&/^[A-Za-z0-9_-]{1,120}$/.test(value)}
export function metaKey(item:string,id:string){return `quality-meta/${item}/${id}.json`}
export function fileKey(item:string,id:string){return `quality-pdf/${item}/${id}.pdf`}
export function textField(form:FormData,name:string,max:number){return String(form.get(name)||'').trim().slice(0,max)}
export function validDate(value:string){return !value||/^\d{4}-\d{2}-\d{2}$/.test(value)&&!isNaN(Date.parse(value))}
