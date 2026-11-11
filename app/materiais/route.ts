import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {getAccess} from '../../lib/access';
export const dynamic='force-dynamic';
export async function GET(req:Request){const u=await getAccess();if(!u)return Response.redirect(new URL('/login',req.url),303);const html=(await readFile(path.resolve('server/materials.html'),'utf8')).replace('__USER_JSON__',JSON.stringify({canEdit:u.canEdit,role:u.role}).replaceAll('<','\\u003c'));return new Response(html,{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}})}
