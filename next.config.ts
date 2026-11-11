import type {NextConfig} from 'next';
const config:NextConfig={async headers(){return [{source:'/api/:path*',headers:[{key:'Cache-Control',value:'no-store'},{key:'X-Content-Type-Options',value:'nosniff'}]},{source:'/:path*',headers:[{key:'Referrer-Policy',value:'same-origin'},{key:'X-Frame-Options',value:'SAMEORIGIN'}]}]}};
export default config;
