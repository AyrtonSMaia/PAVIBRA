import {signOut} from '../../lib/auth';export async function GET(req:Request){await signOut();return Response.redirect(new URL('/login',req.url),303)}
