const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export class ApiClient {
  private token: string | null = null;
  setToken(t:string){this.token=t;}
  clearToken(){this.token=null;}
  private async request(p:string,o:RequestInit={}){
    const hdr:{[k:string]:string}={'Content-Type':'application/json',...(o.headers||{})};
    if(this.token) hdr['Authorization']=`Bearer ${this.token}`;
    return fetch(`${API_URL}${p}`,{...o,headers:hdr});
  }
  async login(pw:string){const r=await this.request('/api/auth/login',{method:'POST',body:JSON.stringify({password:pw})}); if(!r.ok) throw new Error('Login failed'); return r.json(); }
  async getSessions(){return (await this.request('/api/sessions')).json(); }
  async createSession(name?:string){return (await this.request('/api/sessions',{method:'POST',body:JSON.stringify({name})})).json(); }
  async deleteSession(id:string){await this.request(`/api/sessions/${id}`,{method:'DELETE'}); }
  async renameSession(id:string,n:string){return (await this.request(`/api/sessions/${id}/rename`,{method:'PUT',body:JSON.stringify({name:n})})).json(); }
  async getSessionAttachUrl(id:string){return (await this.request(`/api/sessions/${id}/attach`)).json(); }
  async getCommands(){return (await this.request('/api/commands')).json(); }
}
export const api = new ApiClient();