import {database} from '../../../lib/platform';
import {sessionUser,ADMIN_EMAIL,passwordValid,hashPassword,verifyPassword,newSession,rateLimited,digest,safeEqual,activeAccount,originAllowed} from '../../../lib/auth';
export const runtime='nodejs';
export async function GET(){return Response.json({user:await sessionUser()},{headers:{'Cache-Control':'no-store'}})}
export async function POST(req:Request){if(!originAllowed(req))return Response.json({error:'Origem inválida.'},{status:403});try{const data:any=await req.json();const email=String(data.email||'').trim().toLowerCase();if(await rateLimited(email))return Response.json({error:'Muitas tentativas. Aguarde 15 minutos.'},{status:429});if(!passwordValid(data.password))throw Error('Use uma senha com 12 a 256 caracteres.');const db=database().raw;
if(data.action==='setup'){
 const key=process.env.ADMIN_SETUP_KEY;
 if(!key||key.length<24||!safeEqual(String(data.key||''),key)||db.prepare('SELECT email FROM auth_credentials WHERE email=?').get(ADMIN_EMAIL))return Response.json({error:'Chave inválida ou administrador já ativado.'},{status:403});
 db.prepare('INSERT INTO auth_credentials VALUES(?,?,?)').run(ADMIN_EMAIL,hashPassword(data.password),new Date().toISOString());await newSession(ADMIN_EMAIL);return Response.json({ok:true});
}
if(data.action==='activate'){
 const token=digest(String(data.token||''));const a=db.prepare('SELECT * FROM auth_activation WHERE token_hash=?').get(token) as any;
 if(!a||a.expires<Date.now()||!activeAccount(a.email))throw Error('Link de ativação inválido ou expirado.');
 const hash=hashPassword(data.password);db.exec('BEGIN IMMEDIATE');try{const result=db.prepare('DELETE FROM auth_activation WHERE token_hash=? AND expires>?').run(token,Date.now());if(!result.changes)throw Error('Link já utilizado.');db.prepare('INSERT INTO auth_credentials VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET hash=excluded.hash,updated_at=excluded.updated_at').run(a.email,hash,new Date().toISOString());db.prepare('DELETE FROM auth_sessions WHERE email=?').run(a.email);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}await newSession(a.email);return Response.json({ok:true});
}
const r=db.prepare('SELECT hash FROM auth_credentials WHERE email=?').get(email) as any;
const hash=r?.hash||hashPassword('invalid-placeholder');const good=verifyPassword(data.password,hash);
if(!r||!good||!activeAccount(email))return Response.json({error:'E-mail, senha ou acesso inválido.'},{status:401});await newSession(email);return Response.json({ok:true});
}catch(e:any){return Response.json({error:e.message||'Falha na autenticação.'},{status:400})}}
