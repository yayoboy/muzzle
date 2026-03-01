const API_URL = '';
export class ApiClient {
  private token: string | null = null;
  setToken(t:string){this.token=t;}
  clearToken(){this.token=null;}
  private async request(p:string,o:RequestInit={}){
    const hdr: Record<string, string> = { 'Content-Type': 'application/json' };
    if (o.headers) {
      if (o.headers instanceof Headers) {
        o.headers.forEach((value, key) => { hdr[key] = value; });
      } else if (Array.isArray(o.headers)) {
        o.headers.forEach(([key, value]) => { hdr[key] = value; });
      } else {
        Object.assign(hdr, o.headers);
      }
    }
    if(this.token) hdr['Authorization']=`Bearer ${this.token}`;
    const r = await fetch(`${API_URL}${p}`,{...o,headers:hdr});
    if (r.status === 401 && p !== '/api/auth/login') {
      this.clearToken();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('muzzle_token');
        localStorage.removeItem('muzzle_token_expires');
        window.location.reload();
      }
      throw new Error('Session expired');
    }
    return r;
  }
  async login(pw:string){const r=await this.request('/api/auth/login',{method:'POST',body:JSON.stringify({password:pw})}); if(!r.ok) throw new Error('Login failed'); return r.json(); }
  async getSessions(){const r=await this.request('/api/sessions'); if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }
  async createSession(name?:string){const r=await this.request('/api/sessions',{method:'POST',body:JSON.stringify({name})}); if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }
  async deleteSession(id:string){await this.request(`/api/sessions/${id}`,{method:'DELETE'}); }
  async renameSession(id:string,n:string){const r=await this.request(`/api/sessions/${id}/rename`,{method:'PUT',body:JSON.stringify({name:n})}); if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }
  async getSessionAttachUrl(id:string){const r=await this.request(`/api/sessions/${id}/attach`); if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }
  async sendCommand(id:string, command:string){await this.request(`/api/sessions/${id}/command`,{method:'POST',body:JSON.stringify({command})}); }
  async getCommands(){const r=await this.request('/api/commands'); if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }
  async getDiagnostics() {
    const r = await this.request('/api/diagnostics');
    if (!r.ok) throw new Error('Diagnostics failed');
    return r.json();
  }
}
export const api = new ApiClient();
