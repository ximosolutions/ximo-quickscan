// Minimal deterministic PDF and ZIP writers; no external services or dependencies.
const encoder = new TextEncoder();
const bytes = text => encoder.encode(text);
const clean = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?');
const escapePdf = text => clean(text).replace(/[\\()]/g,'\\$&');
function wrap(text, limit) {
  const words = clean(text).split(/\s+/);
  const lines = []; let line = '';
  for (const word of words) {
    if (!word) continue;
    if (word.length > limit) {
      if (line) { lines.push(line); line = ''; }
      for (let i=0;i<word.length;i+=limit) lines.push(word.slice(i,i+limit));
    } else if ((line + ' ' + word).trim().length > limit) {
      if (line) lines.push(line);
      line = word;
    } else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  return lines;
}

function pdfDocument(pages,width,height) {
  const objects=[null,null,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];
  const pageIds=[], wide=width>700, margin=wide?65:48;
  const navy='0.024 0.075 0.129', ink='0.07 0.15 0.20', muted='0.38 0.47 0.52', lime='0.71 1 0.45';
  const rect=(out,x,y,w,h,color)=>out.push(color+' rg',x+' '+y+' '+w+' '+h+' re f');
  const txt=(out,value,x,y,size=12,color=ink,bold=false)=>{
    out.push(color+' rg','BT /F'+(bold?'2':'1')+' '+size+' Tf 1 0 0 1 '+x.toFixed(1)+' '+y.toFixed(1)+' Tm ('+escapePdf(value)+') Tj ET');
  };
  const paragraph=(out,value,x,y,maxWidth,size=12,leading=18,maxLines=8,color=ink,bold=false)=>{
    const lines=wrap(value,Math.max(12,Math.floor(maxWidth/(size*.54))));
    const visible=lines.slice(0,maxLines);
    visible.forEach((line,i)=>txt(out,line,x,y-i*leading,size,color,bold));
    if(lines.length>maxLines && visible.length) txt(out,'[Meer informatie in het brononderzoek]',x,y-visible.length*leading,size*.76,muted);
    return y-visible.length*leading;
  };
  for(const [index,entries] of pages.entries()){
    const dark=index===0||index===pages.length-1;
    const out=[];
    rect(out,0,0,width,height,dark?navy:'1 1 1');
    if(dark){
      rect(out,width-18,0,18,height,lime);
      rect(out,width*.79,0,width*.11,height*.57,'0.09 0.22 0.28');
      // Ximo Intro signature: luminous starbursts, connected constellation and orbital nodes.
      // All motifs stay in the right-hand visual zone, away from the title.
      const motif = (x,y,r,filled=false) => {
        out.push(filled ? '0.71 1 0.45 rg' : '0.71 1 0.45 RG', filled ? '' : '1.2 w');
        const pts=[];
        for(let j=0;j<16;j++){
          const angle=j*Math.PI/8, rr=j%2===0?r:r*.19;
          pts.push([x+Math.cos(angle)*rr,y+Math.sin(angle)*rr]);
        }
        out.push(pts.map((p,j)=>p[0].toFixed(2)+' '+p[1].toFixed(2)+(j?' l':' m')).join(' ')+' h '+(filled?'f':'S'));
      };
      const dot=(x,y,r,color='0.71 1 0.45')=>{
        const k=.55228475;
        out.push(color+' rg', (x+r)+' '+y+' m '+(x+r)+' '+(y+k*r)+' '+(x+k*r)+' '+(y+r)+' '+x+' '+(y+r)+' c '+(x-k*r)+' '+(y+r)+' '+(x-r)+' '+(y+k*r)+' '+(x-r)+' '+y+' c '+(x-r)+' '+(y-k*r)+' '+(x-k*r)+' '+(y-r)+' '+x+' '+(y-r)+' c '+(x+k*r)+' '+(y-r)+' '+(x+r)+' '+(y-k*r)+' '+(x+r)+' '+y+' c f');
      };
      const points=wide
        ? [[.75,.77],[.88,.83],[.92,.59],[.76,.42],[.89,.27],[.69,.19]]
        : [[.79,.78],[.91,.85],[.94,.64],[.80,.46],[.92,.28],[.74,.18]];
      out.push('0.22 0.45 0.41 RG','0.9 w');
      for(let j=0;j<points.length-1;j++){
        const a=points[j],b=points[j+1];
        out.push((a[0]*width)+' '+(a[1]*height)+' m '+(b[0]*width)+' '+(b[1]*height)+' l S');
      }
      points.forEach(([px,py],j)=>dot(px*width,py*height,j%2?3.5:2.3));
      motif(width*.81,height*.70,wide?25:18);
      motif(width*.92,height*.38,wide?15:12,true);
      motif(width*.70,height*.88,wide?9:7,true);
      // Soft green corner panels and small bright particles, not a solid color strip alone.
      rect(out,width*.70,height*.05,width*.16,height*.015,'0.71 1 0.45');
      for(let j=0;j<16;j++){
        const x=width*(.68+(j*37%29)/100),y=height*(.12+(j*19%76)/100);
        dot(x,y,j%3===0?1.8:.9,j%4===0?'0.71 1 0.45':'0.22 0.48 0.42');
      }
      // geometric orbit rings, as in the Ximo Intro visual language
      for(let radius=70;radius<340;radius+=90){
        const cx=width*.91,cy=height*.56;
        out.push('0.16 0.31 0.33 RG','0.8 w');
        const k=.55228475,r=radius;
        out.push((cx+r)+' '+cy+' m '+(cx+r)+' '+(cy+k*r)+' '+(cx+k*r)+' '+(cy+r)+' '+cx+' '+(cy+r)+' c '+(cx-k*r)+' '+(cy+r)+' '+(cx-r)+' '+(cy+k*r)+' '+(cx-r)+' '+cy+' c '+(cx-r)+' '+(cy-k*r)+' '+(cx-k*r)+' '+(cy-r)+' '+cx+' '+(cy-r)+' c '+(cx+k*r)+' '+(cy-r)+' '+(cx+r)+' '+(cy-k*r)+' '+(cx+r)+' '+cy+' c S');
      }
      txt(out,'XIMO',margin,height-53,wide?23:18,'1 1 1',true);
      txt(out,'/ SOLUTIONS',margin+(wide?82:64),height-53,wide?20:16,lime,true);
      txt(out,(index===0?'01 / INTRODUCTIE':'06 / VERVOLG & GESPREK'),margin,height-115,10,lime,true);
      const heading=entries.find(e=>e.title)?.text||'Quickscan';
      if(index===0){
        txt(out,'AI-kansen voor',margin,height-(wide?185:200),wide?43:31,'1 1 1',true);
        const company=entries.find(e=>/^Bedrijf:/.test(e.text))?.text.replace(/^Bedrijf:\s*/,'')||'uw organisatie';
        paragraph(out,company,margin,height-(wide?245:245),width*.65,wide?37:27,wide?44:35,2,'0.71 1 0.45',true);
        txt(out,'EXTERNE QUICKSCAN / GESPREKSSTARTER',margin,height-(wide?318:348),11,'0.77 0.86 0.87',true);
      } else {
        txt(out,'Van kansen naar',margin,height-(wide?193:205),wide?40:30,'1 1 1',true);
        txt(out,'vooruitgang.',margin,height-(wide?245:248),wide?43:32,'0.71 1 0.45',true);
      }
      let y=height-(wide?365:395);
      const content=entries.filter(e=>!e.title);
      for(const entry of content.slice(0,index===0?3:4)){
        if(y<105)break;
        y=paragraph(out,entry.text,margin,y,width*.64,wide?13:11,wide?21:18,index===0?3:4,'0.79 0.86 0.88')-16;
      }
      txt(out,'XIMO SOLUTIONS  /  QUICKSCAN',margin,35,9,'0.63 0.73 0.78');
      txt(out,String(index+1).padStart(2,'0')+' / '+String(pages.length).padStart(2,'0'),width-margin-55,35,9,'0.63 0.73 0.78');
    }else{
      rect(out,0,height-56,width,56,navy);
      txt(out,'XIMO',margin,height-35,14,'1 1 1',true);
      txt(out,'/ SOLUTIONS',margin+44,height-35,13,lime,true);
      txt(out,String(index+1).padStart(2,'0')+' / '+String(pages.length).padStart(2,'0'),width-margin-42,height-35,10,'0.72 0.82 0.85');
      txt(out,String(index+1).padStart(2,'0')+' / QUICKSCAN',margin,height-92,10,muted,true);
      const heading=entries.find(e=>e.title)?.text||'Analyse';
      let y=paragraph(out,heading,margin,height-135,width-margin*2,wide?36:27,wide?44:35,2,ink,true)-16;
      rect(out,margin,y,width-margin*2,3,lime);y-=36;
      const content=entries.filter(e=>!e.title);
      const gap=wide?17:13, cols=wide?2:1, cardW=(width-margin*2-gap*(cols-1))/cols;
      const cardH=wide?104:107;
      let shown=0;
      for(const entry of content){
        const col=shown%cols, row=Math.floor(shown/cols), x=margin+col*(cardW+gap), top=y-row*(cardH+gap);
        if(top-cardH<78)break;
        rect(out,x,top-cardH,cardW,cardH,'0.93 0.96 0.96');
        rect(out,x,top-cardH,4,cardH,'0.71 1 0.45');
        const [rawHeading,...rest]=entry.text.split(' | ');
        const hasHeading=rest.length>0;
        const label=hasHeading?rawHeading:(entry.title?'AI-KANS '+String(shown+1).padStart(2,'0'):'INZICHT '+String(shown+1).padStart(2,'0'));
        paragraph(out,label,x+17,top-23,cardW-34,wide?12:11,wide?15:14,2,ink,true);
        paragraph(out,hasHeading?rest.join(' | '):entry.text,x+17,top-(hasHeading?57:46),cardW-34,wide?11:10,wide?16:15,wide?3:3,'0.25 0.34 0.39');
        shown++;
      }
      if(!shown){
        rect(out,margin,y-130,width-margin*2,130,'0.93 0.96 0.96');
        txt(out,'VERKENNING',margin+18,y-28,10,muted,true);
        paragraph(out,'De belangrijkste inzichten en aannames worden tijdens het gesprek getoetst.',margin+18,y-56,width-margin*2-36,wide?14:12,20,3,ink);
      }
      rect(out,margin,53,width-margin*2,1,'0.84 0.89 0.90');
      txt(out,'XIMO SOLUTIONS  /  QUICKSCAN',margin,34,9,muted);
      txt(out,String(index+1).padStart(2,'0')+' / '+String(pages.length).padStart(2,'0'),width-margin-48,34,9,muted);
    }
    const stream=out.join('\n')+'\n';
    const contentId=objects.length+1;
    objects.push('<< /Length '+bytes(stream).length+' >>\nstream\n'+stream+'endstream');
    const pageId=objects.length+1;
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+width+' '+height+'] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+contentId+' 0 R >>');
    pageIds.push(pageId);
  }
  objects[0]='<< /Type /Catalog /Pages 2 0 R >>';
  objects[1]='<< /Type /Pages /Kids ['+pageIds.map(id=>id+' 0 R').join(' ')+'] /Count '+pageIds.length+' >>';
  const chunks=['%PDF-1.4\n'],offsets=[0];let length=bytes(chunks[0]).length;
  objects.forEach((object,index)=>{offsets.push(length);const chunk=(index+1)+' 0 obj\n'+object+'\nendobj\n';chunks.push(chunk);length+=bytes(chunk).length;});
  const xref=length;
  chunks.push('xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n');
  for(const offset of offsets.slice(1))chunks.push(String(offset).padStart(10,'0')+' 00000 n \n');
  chunks.push('trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');
  return bytes(chunks.join(''));
}

const compact = (value,max=220) => {
  const s=String(value??'').replace(/\s+/g,' ').trim();
  return s.length>max?s.slice(0,max-1).replace(/\s+\S*$/,'')+'…':s;
};
const sourceText = (item) => typeof item==='string'?item:String(item?.url||item?.title||item?.publisher||'');
const marketText = (item) => typeof item==='string'?item:String(item?.trend||item?.description||item?.title||item?.summary||'');
const competitorText = (item) => typeof item==='string'?item:String(item?.name||'Concurrent')+': '+String(item?.comparison||item?.description||'Vergelijkingspunt nog te verifiëren');
function chapterLines(report,index) {
  const internal=report.audience==='internal';
  const lines=[{text:report.chapters[index],title:true}];
  const add=(heading,description)=>lines.push({text:compact(heading,95)+' | '+compact(description,internal?300:180)});
  if(index===0){
    lines.push({text:'Bedrijf: '+report.company});
    lines.push({text:'Website: '+report.website});
    lines.push({text:compact(report.summary||'Bedrijfsprofiel op basis van publiek beschikbare informatie.',internal?620:300)});
    if(internal) lines.push({text:'Status: openbare feiten en aannames onderscheiden; interne processen niet bevestigd.'});
  }else if(index===1){
    const trends=(report.market||[]).slice(0,internal?5:3);
    if(trends.length)trends.forEach((x,i)=>add('Ontwikkeling '+(i+1),marketText(x)));
    else lines.push({text:'Geen onafhankelijk bevestigde markttrends aangeleverd. Te onderzoeken in klantgesprek.'});
    if(internal){
      (report.competitors||[]).slice(0,3).forEach((x,i)=>add('Concurrent '+(i+1),competitorText(x)));
    }
  }else if(index===2){
    report.opportunities.slice(0,internal?5:4).forEach((op,i)=>add(String(i+1).padStart(2,'0')+' / '+op.title,op.painPoint||'Mogelijk knelpunt, nog te verifiëren'));
  }else if(index===3){
    report.opportunities.slice(0,5).forEach((op,i)=>add(String(i+1).padStart(2,'0')+' / '+op.title,op.benefits||'Verwachte voordelen worden besproken'));
  }else if(index===4){
    report.opportunities.slice(0,internal?5:4).forEach((op,i)=>add(String(i+1).padStart(2,'0')+' / '+op.title,(op.impactSummary||'Impact te toetsen')+(internal?' | Haalbaarheid: '+(op.feasibilitySummary||'Te beoordelen'):'')));
  }else{
    if(internal){
      report.opportunities.slice(0,5).forEach((op,i)=>add(String(i+1).padStart(2,'0')+' / '+op.title,op.verificationNote||'Welke knelpunten en prioriteiten herkent de klant?'));
      const refs=(report.sources||[]).slice(0,5).map(sourceText).filter(Boolean);
      if(refs.length) lines.push({text:'Bronnen (selectie): '+refs.join(' | ')});
    }else{
      lines.push({text:'Herkennen jullie deze kansen in de dagelijkse praktijk?'});
      lines.push({text:'Welke uitdaging verdient als eerste aandacht?'});
      lines.push({text:'Samen bepalen we een praktische volgende stap.'});
    }
  }
  return lines;
}
export function createCustomerPdf(report) {
  if (report.audience !== 'customer' || report.chapters.length !== 6) throw Error('Ongeldig klantrapport.');
  return pdfDocument(report.chapters.map((_,i)=>chapterLines(report,i)),960,540);
}
export function createInternalPdf(report) {
  if (report.audience !== 'internal' || report.chapters.length !== 6) throw Error('Ongeldig intern rapport.');
  return pdfDocument(report.chapters.map((_,i)=>chapterLines(report,i)),595.28,841.89);
}
const u16 = (v) => [v&255,(v>>>8)&255];
const u32 = (v) => [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];
function crc32(data) {
  let crc = -1;
  for (const byte of data) {
    crc ^= byte;
    for(let i=0;i<8;i++) crc = (crc>>>1) ^ (crc&1 ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
}
export function zipFiles(files) {
  const parts=[], central=[]; let offset=0;
  for (const {name,data} of files) {
    const filename=bytes(name), checksum=crc32(data);
    const local=new Uint8Array([80,75,3,4,20,0,0,0,0,0,0,0,0,0,...u32(checksum),...u32(data.length),...u32(data.length),...u16(filename.length),0,0]);
    parts.push(local,filename,data);
    central.push(new Uint8Array([80,75,1,2,20,0,20,0,0,0,0,0,0,0,0,0,...u32(checksum),...u32(data.length),...u32(data.length),...u16(filename.length),0,0,0,0,0,0,0,0,0,0,0,0,...u32(offset)]),filename);
    offset += local.length+filename.length+data.length;
  }
  const centralSize=central.reduce((n,p)=>n+p.length,0);
  const end=new Uint8Array([80,75,5,6,0,0,0,0,...u16(files.length),...u16(files.length),...u32(centralSize),...u32(offset),0,0]);
  return new Blob([...parts,...central,end],{type:'application/zip'});
}
export function download(blob,filename) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}
