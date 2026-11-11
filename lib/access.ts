import {env} from './platform';
import {getChatGPTUser} from '../app/chatgpt-auth';
import {ADMIN_EMAIL,originAllowed} from './auth';
export const OWNER=ADMIN_EMAIL;
export const roles=['administrador','gestor','compras','visitante'] as const;
export type Role=typeof roles[number];
export async function getAccess(){
 const identity=await getChatGPTUser();
 if(!identity)return null;
 const email=identity.email.toLowerCase().trim();
 if(email===OWNER)return {...identity,email,name:identity.fullName||'Ayrton Maia',role:'administrador' as Role,canEdit:true,canManage:true,canApprove:true};
 if(!email.endsWith('@pavibra.com.br'))return null;
 const row:any=await env.DB!.prepare('SELECT name,role,active FROM purchase_users WHERE email=?').bind(email).first();
 if(!row||row.active!==1||!roles.includes(row.role))return null;
 return {...identity,email,name:row.name||identity.fullName||email,role:row.role as Role,canEdit:row.role!=='visitante',canManage:row.role==='administrador',canApprove:['administrador','gestor'].includes(row.role)};
}
export function originError(req:Request){return !originAllowed(req)?Response.json({error:'Origem da requisição inválida.'},{status:403}):null;}
export function denied(){return Response.json({error:'Acesso não autorizado. Entre com o e-mail corporativo cadastrado ou solicite a liberação ao administrador.'},{status:403,headers:{'Cache-Control':'no-store'}})}
