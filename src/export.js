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
function pdfDocument(pages, width, height) {
  const objects = [null, null, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const pageIds = [];
  for (const [pageIndex, lines] of pages.entries()) {
    const cover = pageIndex === 0 || pageIndex === pages.length - 1;
    let y = height - (cover ? 145 : 110);
    const commands = [cover ? '0.024 0.075 0.129 rg' : '1 1 1 rg','0 0 '+width+' '+height+' re f'];
    if (cover) {
      commands.push('0.71 1 0.45 rg', (width-25)+' 0 25 '+height+' re f');
      commands.push('0.11 0.24 0.30 rg', (width-155)+' 0 85 '+(height*.62)+' re f');
      commands.push('0.71 1 0.45 rg','BT /F1 16 Tf 1 0 0 1 50 '+(height-45)+' Tm (XIMO / SOLUTIONS) Tj ET');
    } else {
      commands.push('0.024 0.075 0.129 rg','0 '+(height-55)+' '+width+' 55 re f');
      commands.push('0.71 1 0.45 rg','BT /F1 13 Tf 1 0 0 1 50 '+(height-35)+' Tm (XIMO / SOLUTIONS) Tj ET');
      commands.push('0.15 0.23 0.28 rg','BT /F1 9 Tf 1 0 0 1 50 27 Tm (XIMO SOLUTIONS | QUICKSCAN) Tj ET');
      commands.push('BT /F1 9 Tf 1 0 0 1 '+(width-80)+' 27 Tm ('+(pageIndex+1)+' / '+pages.length+') Tj ET');
      commands.push('0.71 1 0.45 rg','50 '+(height-68)+' '+(width-100)+' 3 re f');
      commands.push('0.91 0.95 0.95 rg',(width-18)+' 72 8 '+(height-150)+' re f');
    }
    // Lime is reserved for accents and for text on the dark header; never for body text on white.
    commands.push(cover ? '1 1 1 rg' : '0.06 0.14 0.19 rg');
    for (const entry of lines) {
      const size = entry.title ? 25 : 12;
      const leading = entry.title ? 36 : 19;
      const maxChars = entry.title ? Math.floor((width-100)/14) : Math.floor((width-100)/6.5);
      for (const part of wrap(entry.text,maxChars)) {
        if (y < (cover ? 65 : 65)) break;
        commands.push('BT /F1 '+size+' Tf 1 0 0 1 50 '+y.toFixed(1)+' Tm ('+escapePdf(part)+') Tj ET');
        y -= leading;
      }
      y -= entry.title ? 12 : 7;
    }
    const stream = commands.join('\n')+'\n';
    const contentId = objects.length+1;
    objects.push('<< /Length '+bytes(stream).length+' >>\nstream\n'+stream+'endstream');
    const pageId = objects.length+1;
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+width+' '+height+'] /Resources << /Font << /F1 3 0 R >> >> /Contents '+contentId+' 0 R >>');
    pageIds.push(pageId);
  }
  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = '<< /Type /Pages /Kids ['+pageIds.map(id=>id+' 0 R').join(' ')+'] /Count '+pageIds.length+' >>';
  const chunks = ['%PDF-1.4\n'];
  const offsets = [0]; let length = bytes(chunks[0]).length;
  objects.forEach((object,index) => {
    offsets.push(length);
    const chunk = (index+1)+' 0 obj\n'+object+'\nendobj\n';
    chunks.push(chunk); length += bytes(chunk).length;
  });
  const xref = length;
  chunks.push('xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n');
  for (const offset of offsets.slice(1)) chunks.push(String(offset).padStart(10,'0')+' 00000 n \n');
  chunks.push('trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');
  return bytes(chunks.join(''));
}
function chapterLines(report,index) {
  const lines = [{text:report.chapters[index],title:true}];
  if (index === 0) {
    lines.push({text:'Bedrijf: '+report.company},{text:'Website: '+report.website},{text:report.summary || 'Uitgangssituatie wordt tijdens het gesprek geverifieerd.'});
  } else if (index === 1) {
    lines.push({text:'Marktontwikkelingen en externe aannames vragen verdere verificatie.'});
  } else if (index === 2) {
    lines.push({text:'Mogelijke pijnpunten op basis van extern onderzoek.'});
    for (const op of report.opportunities) lines.push({text:op.title+': '+(op.painPoint||'Te verifiëren')});
  } else if (index === 3) {
    for (const op of report.opportunities) {
      lines.push({text:op.title,title:true},{text:'Pijnpunt: '+(op.painPoint||'Te verifiëren')},{text:'Voordeel: '+(op.benefits||'Te verifiëren')});
      if (report.audience === 'internal') {
        lines.push({text:'Interne oplossingsrichting: '+(op.internalSolution||'Nog uit te werken')});
        lines.push({text:'Bronnen: '+(op.sourceRefs||[]).join(', ')});
      }
    }
  } else if (index === 4) {
    for (const op of report.opportunities) lines.push({text:op.title+': '+(op.impactSummary||'Impact nog te bepalen')});
    lines.push({text:'Geen financiële berekening: route 1 werkt met kwalitatieve impact.'});
  } else {
    lines.push({text:'Bespreek de kansen en verifieer de belangrijkste aannames met de klant.'});
    if (report.audience === 'internal') for (const op of report.opportunities) lines.push({text:op.title+': '+(op.verificationNote||'Welke concrete knelpunten ervaart de klant?')});
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
