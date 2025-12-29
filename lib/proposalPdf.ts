import jsPDF from 'jspdf';
import { Proposal } from '../types';

export const generateProposalPDF = (proposal: Proposal, companyName: string = 'RoofPro AI') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  const addText = (text: string, size: number, isBold: boolean = false, color: string = '#000000') => {
    doc.setFontSize(size);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const rgb = hexToRgb(color);
    doc.setTextColor(rgb.r, rgb.g, rgb.b);
  };

  const addLine = (y: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.line(20, y, pageWidth - 20, y);
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
      return true;
    }
    return false;
  };

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 60, 'F');

  addText(companyName, 24, true, '#FFFFFF');
  doc.text(companyName, 20, 25);

  addText('Professional Roofing Proposal', 14, false, '#DBEAFE');
  doc.text('Professional Roofing Proposal', 20, 35);

  addText(proposal.number, 12, false, '#DBEAFE');
  doc.text(proposal.number, 20, 45);

  yPos = 75;

  addText(proposal.title, 20, true, '#1e293b');
  doc.text(proposal.title, 20, yPos);
  yPos += 15;

  doc.setFillColor(241, 245, 249);
  doc.rect(20, yPos, (pageWidth - 50) / 2, 40, 'F');

  addText('Prepared For:', 10, true, '#64748b');
  doc.text('Prepared For:', 25, yPos + 8);

  addText(proposal.leadName, 11, true, '#1e293b');
  doc.text(proposal.leadName, 25, yPos + 16);

  addText(proposal.leadAddress, 9, false, '#64748b');
  const addressLines = doc.splitTextToSize(proposal.leadAddress, (pageWidth - 60) / 2 - 10);
  doc.text(addressLines, 25, yPos + 22);

  addText(proposal.leadPhone, 9, false, '#64748b');
  doc.text(proposal.leadPhone, 25, yPos + 32);

  doc.setFillColor(241, 245, 249);
  doc.rect((pageWidth / 2) + 5, yPos, (pageWidth - 50) / 2, 40, 'F');

  addText('Proposal Details:', 10, true, '#64748b');
  doc.text('Proposal Details:', (pageWidth / 2) + 10, yPos + 8);

  addText(`Created: ${new Date(proposal.createdDate).toLocaleDateString()}`, 9, false, '#1e293b');
  doc.text(`Created: ${new Date(proposal.createdDate).toLocaleDateString()}`, (pageWidth / 2) + 10, yPos + 16);

  addText(`Valid Until: ${new Date(proposal.validUntil).toLocaleDateString()}`, 9, false, '#1e293b');
  doc.text(`Valid Until: ${new Date(proposal.validUntil).toLocaleDateString()}`, (pageWidth / 2) + 10, yPos + 24);

  addText(`Status: ${proposal.status}`, 9, false, '#1e293b');
  doc.text(`Status: ${proposal.status}`, (pageWidth / 2) + 10, yPos + 32);

  yPos += 55;

  addText('Project Overview', 16, true, '#1e293b');
  doc.text('Project Overview', 20, yPos);
  yPos += 10;

  addText(proposal.projectDescription, 10, false, '#475569');
  const descLines = doc.splitTextToSize(proposal.projectDescription, pageWidth - 40);
  doc.text(descLines, 20, yPos);
  yPos += (descLines.length * 5) + 10;

  checkPageBreak(20);
  addText('Scope of Work', 16, true, '#1e293b');
  doc.text('Scope of Work', 20, yPos);
  yPos += 10;

  proposal.scopeOfWork.forEach((item, index) => {
    checkPageBreak(10);
    doc.setFillColor(16, 185, 129);
    doc.circle(23, yPos - 2, 1.5, 'F');

    addText(item, 10, false, '#475569');
    const itemLines = doc.splitTextToSize(item, pageWidth - 50);
    doc.text(itemLines, 28, yPos);
    yPos += (itemLines.length * 5) + 3;
  });

  yPos += 10;

  checkPageBreak(30);
  addText('Investment Options', 16, true, '#1e293b');
  doc.text('Investment Options', 20, yPos);
  yPos += 5;

  addText('Choose the package that best fits your needs', 10, false, '#64748b');
  doc.text('Choose the package that best fits your needs', 20, yPos);
  yPos += 15;

  proposal.options.forEach((option, index) => {
    checkPageBreak(80);

    const tierColors: { [key: string]: { bg: number[], border: number[], text: number[] } } = {
      'Good': { bg: [241, 245, 249], border: [148, 163, 184], text: [71, 85, 105] },
      'Better': { bg: [239, 246, 255], border: [59, 130, 246], text: [30, 64, 175] },
      'Best': { bg: [240, 253, 244], border: [16, 185, 129], text: [5, 150, 105] }
    };

    const colors = tierColors[option.tier] || tierColors['Good'];

    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.setLineWidth(option.isRecommended ? 1 : 0.5);
    doc.roundedRect(20, yPos, pageWidth - 40, 70, 3, 3, 'D');

    doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
    doc.roundedRect(20, yPos, pageWidth - 40, 12, 3, 3, 'F');

    addText(`${option.tier} - ${option.name}`, 12, true, `rgb(${colors.text[0]},${colors.text[1]},${colors.text[2]})`);
    doc.text(`${option.tier} - ${option.name}`, 25, yPos + 8);

    if (option.isRecommended) {
      doc.setFillColor(251, 191, 36);
      doc.rect(pageWidth - 80, yPos + 2, 55, 8, 'F');
      addText('BEST VALUE', 8, true, '#FFFFFF');
      doc.text('BEST VALUE', pageWidth - 77, yPos + 7);
    }

    addText(option.description, 9, false, '#64748b');
    doc.text(option.description, 25, yPos + 20);

    addText('$' + option.price.toLocaleString(), 18, true, `rgb(${colors.text[0]},${colors.text[1]},${colors.text[2]})`);
    doc.text('$' + option.price.toLocaleString(), 25, yPos + 32);

    if (option.savings && option.savings > 0) {
      addText(`Save $${option.savings}`, 9, true, '#10b981');
      doc.text(`Save $${option.savings}`, 25, yPos + 40);
    }

    addText(`Warranty: ${option.warranty}`, 8, false, '#64748b');
    doc.text(`Warranty: ${option.warranty}`, 25, yPos + 50);

    addText(`Timeline: ${option.timeline}`, 8, false, '#64748b');
    doc.text(`Timeline: ${option.timeline}`, 25, yPos + 58);

    const featuresText = option.features.slice(0, 3).join(' • ');
    addText(featuresText, 8, false, '#64748b');
    const featLines = doc.splitTextToSize(featuresText, pageWidth - 50);
    doc.text(featLines, 25, yPos + 66);

    yPos += 80;
  });

  checkPageBreak(40);
  yPos += 10;
  addText('Terms & Conditions', 16, true, '#1e293b');
  doc.text('Terms & Conditions', 20, yPos);
  yPos += 10;

  proposal.terms.forEach((term, index) => {
    checkPageBreak(10);
    addText(`${index + 1}. ${term}`, 9, false, '#475569');
    const termLines = doc.splitTextToSize(`${index + 1}. ${term}`, pageWidth - 40);
    doc.text(termLines, 20, yPos);
    yPos += (termLines.length * 5) + 3;
  });

  yPos += 15;
  checkPageBreak(30);
  addLine(yPos);
  yPos += 10;

  addText('Thank you for considering our proposal!', 11, true, '#1e293b');
  doc.text('Thank you for considering our proposal!', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  addText('We look forward to working with you.', 10, false, '#64748b');
  doc.text('We look forward to working with you.', pageWidth / 2, yPos, { align: 'center' });

  doc.save(`${proposal.number}.pdf`);
};
