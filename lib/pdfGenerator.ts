import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface MeasurementSegment {
  label?: string;
  area: number;
  geometry?: any[];
}

interface RoofMeasurementData {
  address: string;
  total_area: number;
  segments: MeasurementSegment[];
  measurement_date: string;
  has_3d_model?: boolean;
  measurement_type?: string;
}

export const generateEstimatePDF = async (
  element: HTMLElement,
  fileName: string
): Promise<void> => {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    const pdf = new jsPDF('p', 'mm', 'a4');
    let position = 0;

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const generateMeasurementReportPDF = (
  measurement: RoofMeasurementData,
  companyName: string = 'RoofPro AI'
): void => {
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

  addText('Professional Roof Measurement Report', 14, false, '#DBEAFE');
  doc.text('Professional Roof Measurement Report', 20, 35);

  addText(`Report Date: ${new Date().toLocaleDateString()}`, 10, false, '#DBEAFE');
  doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 20, 48);

  yPos = 75;

  addText('Property Information', 16, true, '#1e293b');
  doc.text('Property Information', 20, yPos);
  yPos += 10;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(20, yPos, pageWidth - 40, 25, 3, 3, 'F');

  addText(`Address: ${measurement.address}`, 11, true, '#1e293b');
  doc.text(`Address: ${measurement.address}`, 25, yPos + 8);

  addText(`Measurement Date: ${new Date(measurement.measurement_date).toLocaleDateString()}`, 10, false, '#64748b');
  doc.text(`Measurement Date: ${new Date(measurement.measurement_date).toLocaleDateString()}`, 25, yPos + 18);

  yPos += 35;

  const measurementType = measurement.has_3d_model ? '3D Model (High Accuracy)' : measurement.measurement_type || 'Manual';
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(20, yPos, pageWidth - 40, 40, 3, 3, 'F');

  addText(`TOTAL ROOF AREA`, 10, true, '#3b82f6');
  doc.text('TOTAL ROOF AREA', pageWidth / 2, yPos + 10, { align: 'center' });

  addText(`${measurement.total_area.toLocaleString()} sq ft`, 24, true, '#1e293b');
  doc.text(`${measurement.total_area.toLocaleString()} sq ft`, pageWidth / 2, yPos + 22, { align: 'center' });

  addText(`Measurement Type: ${measurementType}`, 9, false, '#64748b');
  doc.text(`Measurement Type: ${measurementType}`, pageWidth / 2, yPos + 32, { align: 'center' });

  yPos += 50;

  checkPageBreak(20);
  addText('Roof Section Breakdown', 16, true, '#1e293b');
  doc.text('Roof Section Breakdown', 20, yPos);
  yPos += 10;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 5;

  addText('Section Name', 10, true, '#64748b');
  doc.text('Section Name', 25, yPos);

  addText('Area (sq ft)', 10, true, '#64748b');
  doc.text('Area (sq ft)', pageWidth - 60, yPos);

  yPos += 5;
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 8;

  measurement.segments.forEach((segment, index) => {
    checkPageBreak(10);

    const sectionName = segment.label || `Section ${index + 1}`;
    addText(sectionName, 10, false, '#1e293b');
    doc.text(sectionName, 25, yPos);

    addText(Math.round(segment.area).toLocaleString(), 10, false, '#1e293b');
    doc.text(Math.round(segment.area).toLocaleString(), pageWidth - 60, yPos);

    yPos += 8;

    if (index < measurement.segments.length - 1) {
      doc.setDrawColor(241, 245, 249);
      doc.line(20, yPos - 4, pageWidth - 20, yPos - 4);
    }
  });

  yPos += 5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 8;

  addText('TOTAL', 11, true, '#1e293b');
  doc.text('TOTAL', 25, yPos);

  addText(measurement.total_area.toLocaleString(), 11, true, '#3b82f6');
  doc.text(measurement.total_area.toLocaleString(), pageWidth - 60, yPos);

  yPos += 20;

  checkPageBreak(30);
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(20, yPos, pageWidth - 40, 25, 3, 3, 'F');

  addText('Important Note', 10, true, '#92400e');
  doc.text('Important Note', 25, yPos + 8);

  addText('These measurements are estimates based on satellite imagery and should be verified on-site before final material ordering.', 9, false, '#78350f');
  const noteLines = doc.splitTextToSize('These measurements are estimates based on satellite imagery and should be verified on-site before final material ordering.', pageWidth - 50);
  doc.text(noteLines, 25, yPos + 16);

  yPos = pageHeight - 30;
  addLine(yPos);
  yPos += 8;

  addText('Professional Measurement Certification', 10, true, '#1e293b');
  doc.text('Professional Measurement Certification', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  addText(`This measurement report was generated by ${companyName} using professional satellite measurement technology.`, 8, false, '#64748b');
  const certLines = doc.splitTextToSize(`This measurement report was generated by ${companyName} using professional satellite measurement technology.`, pageWidth - 40);
  doc.text(certLines, pageWidth / 2, yPos, { align: 'center' });

  const fileName = `Measurement_${measurement.address.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
