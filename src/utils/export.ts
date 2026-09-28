import Konva from 'konva';
import { jsPDF } from 'jspdf';
import { Project, UnitSystem } from '../models/types';
import { formatArea } from './units';
import { calculateBoxArea, calculateCircleArea } from './geometry';

/**
 * Exports Konva stage as high-resolution PNG image
 */
export function exportStageToPNG(
  stage: Konva.Stage,
  projectName: string,
  pixelRatio: number = 2
): void {
  // Capture high-res data URL
  const dataURL = stage.toDataURL({ pixelRatio });
  const link = document.createElement('a');
  const safeName = projectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'naqsha_floor_plan';
  link.download = `${safeName}.png`;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports floor plan as high-quality architectural PDF document with title block
 */
export function exportStageToPDF(
  stage: Konva.Stage,
  project: Project,
  unitSystem: UnitSystem
): void {
  const dataURL = stage.toDataURL({ pixelRatio: 2 });
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297; // A4 landscape mm
  const pageHeight = 210;

  // Background Title & Header Block
  pdf.setFillColor(15, 23, 42); // slate-900
  pdf.rect(0, 0, pageWidth, 22, 'F');

  // Title text
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('NAQSHA - Architectural Floor Plan', 14, 12);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(148, 163, 184); // slate-400
  pdf.text(`Project: ${project.name}`, 14, 18);

  // Date and stats in header right
  const dateStr = new Date(project.updatedAt || Date.now()).toLocaleDateString('en-GB');
  pdf.text(`Date: ${dateStr}  |  Units: ${unitSystem === 'ft' ? 'Feet & Inches' : 'Inches'}`, pageWidth - 14, 14, { align: 'right' });

  // Calculate total room area
  let totalArea = 0;
  project.elements.forEach((el) => {
    if (el.type === 'box') totalArea += calculateBoxArea(el.width, el.height);
    if (el.type === 'circle') totalArea += calculateCircleArea(el.radius);
  });
  if (totalArea > 0) {
    pdf.text(`Total Area: ${formatArea(totalArea, unitSystem)}`, pageWidth - 14, 18, { align: 'right' });
  }

  // Canvas Image inside PDF margins
  const marginX = 14;
  const marginY = 28;
  const imgWidth = pageWidth - marginX * 2;
  const imgHeight = pageHeight - marginY - 14;

  pdf.addImage(dataURL, 'PNG', marginX, marginY, imgWidth, imgHeight, undefined, 'FAST');

  // Footer bar
  pdf.setFillColor(241, 245, 249);
  pdf.rect(0, pageHeight - 10, pageWidth, 10, 'F');
  pdf.setTextColor(100, 116, 139);
  pdf.setFontSize(8);
  pdf.text('Designed with Naqsha 2D CAD Web App (Installable Offline PWA)', 14, pageHeight - 4);
  pdf.text(`Elements: ${project.elements.length}`, pageWidth - 14, pageHeight - 4, { align: 'right' });

  const safeName = project.name.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'naqsha_floor_plan';
  pdf.save(`${safeName}.pdf`);
}

/**
 * Exports project as .naqsha.json file
 */
export function exportProjectToJSON(project: Project): void {
  const jsonString = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = project.name.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'naqsha';
  link.download = `${safeName}.naqsha.json`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Imports project from a JSON file
 */
export function importProjectFromJSON(file: File): Promise<Project> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed && Array.isArray(parsed.elements)) {
          resolve(parsed as Project);
        } else {
          reject(new Error('Invalid project file format'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
