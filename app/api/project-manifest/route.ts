import {env} from '../../../lib/platform';
import {getAccess,denied} from '../../../lib/access';
export async function GET(){if(!await getAccess())return denied();const o=await env.BUCKET.get('project-manifest.json');const data=o?await o.json():{};return new Response('window.PROJECT_PDF_SEED='+JSON.stringify(data).replaceAll('<','\\u003c')+';',{headers:{'Content-Type':'application/javascript','Cache-Control':'no-store'}})}
