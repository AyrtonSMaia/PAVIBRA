import {getAccess,denied,originError} from '../../../../lib/access';
import {issueActivation} from '../../../../lib/auth';
export async function POST(req:Request){const blocked=originError(req);if(blocked)return blocked;const user=await getAccess();if(!user?.canManage)return denied();try{const d=await req.json();return Response.json({token:issueActivation(String(d.email||'').toLowerCase().trim())},{headers:{'Cache-Control':'no-store'}})}catch(e:any){return Response.json({error:e.message},{status:400})}}
