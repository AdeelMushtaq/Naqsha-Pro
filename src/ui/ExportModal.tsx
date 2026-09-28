import React, { useState } from 'react';
import {
  Download,
  X,
  FileDown,
  Printer,
  FileCode,
  Image,
  Layers,
  Building,
  Check,
  Truck,
} from 'lucide-react';
import Konva from 'konva';
import { jsPDF } from 'jspdf';
import { useStore } from '../store/useStore';
import { translations } from '../i18n';
import { exportStageToPNG, exportProjectToJSON } from '../utils/export';
import { generateDxfString } from '../utils/dxf';
import { formatAreaWithUnit, formatLength } from '../utils/units';
import { calculateBoxArea, calculateCircleArea } from '../utils/geometry';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stageRef: React.RefObject<Konva.Stage | null>;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  stageRef,
}) => {
  const { project, unitSystem, areaUnit, language } = useStore();
  const t = translations[language];

  const [paperSize, setPaperSize] = useState<'a4' | 'a3' | 'a2'>('a4');
  const [scaleRatio, setScaleRatio] = useState<'1:50' | '1:100' | '1:200' | 'custom'>('1:100');
  const [includeSchedule, setIncludeSchedule] = useState(true);
  const [includeTitleBlock, setIncludeTitleBlock] = useState(true);
  const [includeVehicleReport, setIncludeVehicleReport] = useState(
    (project.vehicleChecks?.length || 0) > 0
  );
  const [ownerName, setOwnerName] = useState(project.ownerName || 'Chaudhry Sahib');
  const [designerName, setDesignerName] = useState('Naqsha Architectural CAD');

  if (!isOpen) return null;

  // Compile list of rooms for Area Schedule
  const roomSchedule: { name: string; areaSqInches: number }[] = [];
  project.elements.forEach((el) => {
    if (el.hidden) return;
    if (el.type === 'box') {
      const area = calculateBoxArea(el.width, el.height);
      roomSchedule.push({ name: el.label || 'Kamra (Room)', areaSqInches: area });
    } else if (el.type === 'circle') {
      const area = calculateCircleArea(el.radius);
      roomSchedule.push({ name: el.label || 'Gol Kamra', areaSqInches: area });
    }
  });

  const handleExportPDF = () => {
    const stage = stageRef.current;
    if (!stage) return;

    const dataURL = stage.toDataURL({ pixelRatio: 2.5 });
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: paperSize,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // 1. Title Block Header
    if (includeTitleBlock) {
      pdf.setFillColor(15, 23, 42); // slate-900
      pdf.rect(0, 0, pageWidth, 24, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('NAQSHA - ARCHITECTURAL BLUEPRINT', 14, 11);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(148, 163, 184); // slate-400
      pdf.text(`Project: ${project.name}  |  Owner: ${ownerName}`, 14, 18);

      const activeFloor = project.floors?.find((f) => f.id === project.activeFloorId)?.name || 'Ground Floor';
      pdf.text(
        `Scale: ${scaleRatio}  |  Paper: ${paperSize.toUpperCase()}  |  Floor: ${activeFloor}  |  Date: ${new Date().toLocaleDateString()}`,
        pageWidth - 14,
        14,
        { align: 'right' }
      );
    }

    // 2. Main Floor Plan Canvas Image
    const marginX = 14;
    const marginY = includeTitleBlock ? 28 : 14;
    const scheduleWidth = includeSchedule && roomSchedule.length > 0 ? 65 : 0;
    const canvasWidth = pageWidth - marginX * 2 - (scheduleWidth > 0 ? scheduleWidth + 8 : 0);
    const canvasHeight = pageHeight - marginY - 14;

    pdf.addImage(dataURL, 'PNG', marginX, marginY, canvasWidth, canvasHeight, undefined, 'FAST');

    // 3. Area Schedule Table Box on Right
    if (includeSchedule && roomSchedule.length > 0) {
      const tableX = pageWidth - marginX - scheduleWidth;
      const tableY = marginY;

      pdf.setFillColor(248, 250, 252);
      pdf.rect(tableX, tableY, scheduleWidth, 8, 'F');
      pdf.setDrawColor(203, 213, 225);
      pdf.rect(tableX, tableY, scheduleWidth, Math.min(100, 10 + roomSchedule.length * 6), 'S');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text('AREA SCHEDULE', tableX + 4, tableY + 5.5);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);

      let currY = tableY + 13;
      let totalScheduleArea = 0;
      roomSchedule.slice(0, 14).forEach((r) => {
        totalScheduleArea += r.areaSqInches;
        pdf.setTextColor(51, 65, 85);
        pdf.text(r.name, tableX + 4, currY);
        pdf.setTextColor(15, 23, 42);
        pdf.text(formatAreaWithUnit(r.areaSqInches, 'sqft'), tableX + scheduleWidth - 4, currY, {
          align: 'right',
        });
        currY += 5.5;
      });

      pdf.setFont('helvetica', 'bold');
      pdf.text('Total Area:', tableX + 4, currY + 2);
      pdf.text(formatAreaWithUnit(totalScheduleArea, 'sqft'), tableX + scheduleWidth - 4, currY + 2, {
        align: 'right',
      });
    }

    // 4. Footer
    pdf.setFillColor(241, 245, 249);
    pdf.rect(0, pageHeight - 8, pageWidth, 8, 'F');
    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(7.5);
    pdf.text(`Architectural Drafting: ${designerName}  |  Generated by Naqsha 2D CAD`, 14, pageHeight - 3);

    // 5. Optional Vehicle Access Report Page(s)
    if (includeVehicleReport && project.vehicleChecks && project.vehicleChecks.length > 0) {
      appendVehicleReportPages(pdf, dataURL, pageWidth, pageHeight);
    }

    const safeName = project.name.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'naqsha';
    pdf.save(`${safeName}_blueprint_${paperSize}.pdf`);
    onClose();
  };

  const appendVehicleReportPages = (
    pdf: jsPDF,
    dataURL: string,
    pageWidth: number,
    pageHeight: number
  ) => {
    project.vehicleChecks?.forEach((session) => {
      pdf.addPage(paperSize, 'landscape');

      // Title bar
      pdf.setFillColor(15, 23, 42); // slate-900
      pdf.rect(0, 0, pageWidth, 24, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('NAQSHA - VEHICLE & LARGE OBJECT ACCESS REPORT', 14, 11);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        `Session: ${session.name}  |  Vehicle: ${session.vehicle.name}  |  Project: ${project.name}`,
        14,
        18
      );
      pdf.text(
        `Date: ${new Date().toLocaleDateString()}  |  Units: ${unitSystem === 'ft' ? 'Feet & Inches' : 'Inches'}`,
        pageWidth - 14,
        14,
        { align: 'right' }
      );

      // Left column: Plan Snapshot
      const snapWidth = (pageWidth - 28) * 0.58;
      const snapHeight = pageHeight - 38;
      pdf.addImage(dataURL, 'PNG', 14, 28, snapWidth, snapHeight, undefined, 'FAST');

      // Right column: Detailed Report
      const rightX = 14 + snapWidth + 8;
      const rightWidth = pageWidth - 14 - rightX;
      let curY = 28;

      const res = session.result;

      // Verdict Banner
      if (res) {
        if (res.verdict === 'pass') {
          pdf.setFillColor(16, 185, 129); // emerald
          pdf.roundedRect(rightX, curY, rightWidth, 18, 3, 3, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.text('VERDICT: JA SAKTI HAI (PASSED)', rightX + 6, curY + 8);
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.text('Gari / trailer aasaani se gate tak pohnch sakti hai.', rightX + 6, curY + 14);
        } else if (res.verdict === 'tight') {
          pdf.setFillColor(245, 158, 11); // amber
          pdf.roundedRect(rightX, curY, rightWidth, 18, 3, 3, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.text('VERDICT: TANG HAI (CAUTION / TIGHT)', rightX + 6, curY + 8);
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.text('Margin bohat kam hai (< 1 ft). Ihtiyat darkaar hai.', rightX + 6, curY + 14);
        } else {
          pdf.setFillColor(239, 68, 68); // rose
          pdf.roundedRect(rightX, curY, rightWidth, 18, 3, 3, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.text('VERDICT: NAHI JA SAKTI (BLOCKED)', rightX + 6, curY + 8);
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.text('Deewar, gate post ya rukawat se takrao mutawaqqe hai.', rightX + 6, curY + 14);
        }
        curY += 22;

        // Clearances Box
        pdf.setFillColor(248, 250, 252);
        pdf.rect(rightX, curY, rightWidth, 34, 'F');
        pdf.setDrawColor(226, 232, 240);
        pdf.rect(rightX, curY, rightWidth, 34, 'S');

        pdf.setTextColor(15, 23, 42);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text('CLEARANCES (PAMAISH)', rightX + 5, curY + 6);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(71, 85, 105);
        pdf.text('Gate Side Clearance:', rightX + 5, curY + 13);
        pdf.setTextColor(15, 23, 42);
        pdf.text(formatLength(res.minGateClearance, unitSystem), rightX + rightWidth - 5, curY + 13, { align: 'right' });

        pdf.setTextColor(71, 85, 105);
        pdf.text('Neighbor / Obstacle Clearance:', rightX + 5, curY + 19);
        pdf.setTextColor(15, 23, 42);
        pdf.text(formatLength(res.minSideClearance, unitSystem), rightX + rightWidth - 5, curY + 19, { align: 'right' });

        pdf.setTextColor(71, 85, 105);
        pdf.text('Overhead / Height Clearance:', rightX + 5, curY + 25);
        pdf.setTextColor(15, 23, 42);
        pdf.text(formatLength(res.minOverheadClearance, unitSystem), rightX + rightWidth - 5, curY + 25, { align: 'right' });

        pdf.setTextColor(71, 85, 105);
        pdf.text('Collisions Detected:', rightX + 5, curY + 31);
        pdf.setTextColor(res.collisions.length > 0 ? 220 : 15, res.collisions.length > 0 ? 38 : 23, res.collisions.length > 0 ? 38 : 42);
        pdf.text(`${res.collisions.length}`, rightX + rightWidth - 5, curY + 31, { align: 'right' });

        curY += 38;
      }

      // Vehicle Specifications Box
      pdf.setFillColor(248, 250, 252);
      pdf.rect(rightX, curY, rightWidth, 36, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(rightX, curY, rightWidth, 36, 'S');

      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('VEHICLE SPECIFICATIONS', rightX + 5, curY + 6);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text('Length × Width × Height:', rightX + 5, curY + 13);
      pdf.setTextColor(15, 23, 42);
      const lStr = formatLength(session.vehicle.length, unitSystem);
      const wStr = formatLength(session.vehicle.width, unitSystem);
      const hStr = formatLength(session.vehicle.height, unitSystem);
      pdf.text(`${lStr} × ${wStr} × ${hStr}`, rightX + rightWidth - 5, curY + 13, { align: 'right' });

      pdf.setTextColor(71, 85, 105);
      pdf.text('Wheelbase & Min Turning R:', rightX + 5, curY + 19);
      pdf.setTextColor(15, 23, 42);
      const wbStr = formatLength(session.vehicle.wheelbase, unitSystem);
      const trStr = formatLength(session.vehicle.minTurningRadius, unitSystem);
      pdf.text(`${wbStr} / Turn R: ${trStr}`, rightX + rightWidth - 5, curY + 19, { align: 'right' });

      pdf.setTextColor(71, 85, 105);
      pdf.text('Front / Rear Overhangs:', rightX + 5, curY + 25);
      pdf.setTextColor(15, 23, 42);
      pdf.text(
        `${formatLength(session.vehicle.frontOverhang, unitSystem)} / ${formatLength(session.vehicle.rearOverhang, unitSystem)}`,
        rightX + rightWidth - 5,
        curY + 25,
        { align: 'right' }
      );

      pdf.setTextColor(71, 85, 105);
      pdf.text('Mirror Extra Width:', rightX + 5, curY + 31);
      pdf.setTextColor(15, 23, 42);
      pdf.text(
        `${formatLength(session.vehicle.mirrorExtraWidth, unitSystem)} each side`,
        rightX + rightWidth - 5,
        curY + 31,
        { align: 'right' }
      );

      curY += 40;

      // Suggestions Box
      if (res && res.suggestions.length > 0) {
        pdf.setFillColor(254, 243, 199);
        pdf.rect(rightX, curY, rightWidth, 24, 'F');
        pdf.setDrawColor(251, 191, 36);
        pdf.rect(rightX, curY, rightWidth, 24, 'S');

        pdf.setTextColor(146, 64, 14);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.text('ARCHITECTURAL RECOMMENDATIONS:', rightX + 4, curY + 5);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        let sugY = curY + 10;
        res.suggestions.slice(0, 3).forEach((sug) => {
          pdf.text(`• ${sug}`, rightX + 4, sugY);
          sugY += 4.5;
        });
      }

      // Footer
      pdf.setFillColor(241, 245, 249);
      pdf.rect(0, pageHeight - 8, pageWidth, 8, 'F');
      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(7.5);
      pdf.text(
        `Naqsha CAD Vehicle Access Evaluation Report | Simulated with Kinematic Bicycle Model`,
        14,
        pageHeight - 3
      );
    });
  };

  const handleExportVehicleReportOnly = () => {
    const stage = stageRef.current;
    if (!stage) return;

    const dataURL = stage.toDataURL({ pixelRatio: 2.5 });
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: paperSize,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    if (project.vehicleChecks && project.vehicleChecks.length > 0) {
      appendVehicleReportPages(pdf, dataURL, pageWidth, pageHeight);
      // Delete the initial blank first page created by jsPDF constructor
      pdf.deletePage(1);
    } else {
      pdf.setFontSize(12);
      pdf.text('No Vehicle Checks recorded in this project yet.', 14, 20);
    }

    const safeName = project.name.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'naqsha';
    pdf.save(`${safeName}_vehicle_access_report_${paperSize}.pdf`);
    onClose();
  };

  const handleExportDXF = () => {
    const dxfText = generateDxfString(project);
    const blob = new Blob([dxfText], { type: 'application/dxf;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = project.name.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'naqsha';
    link.download = `${safeName}.dxf`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onClose();
  };

  const handleExportSVG = () => {
    const stage = stageRef.current;
    if (!stage) return;

    // Convert stage to high-res SVG container
    const dataURL = stage.toDataURL({ pixelRatio: 2 });
    const width = stage.width();
    const height = stage.height();

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <!-- Naqsha 2D Floor Plan SVG Export -->
  <image width="${width}" height="${height}" xlink:href="${dataURL}" />
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = project.name.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'naqsha';
    link.download = `${safeName}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-200 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {t.exportPro.title}
              </h2>
              <p className="text-xs text-slate-400">
                Architectural PDF blueprints, AutoCAD DXF, SVG, and high-res PNG
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Options */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Paper Size & Scale */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                {t.exportPro.paperSize}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['a4', 'a3', 'a2'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setPaperSize(size)}
                    className={`py-2 rounded-xl font-bold uppercase transition-all ${
                      paperSize === size
                        ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                {t.exportPro.scale}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['1:50', '1:100', '1:200'] as const).map((sc) => (
                  <button
                    key={sc}
                    onClick={() => setScaleRatio(sc)}
                    className={`py-2 rounded-xl font-bold transition-all ${
                      scaleRatio === sc
                        ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    {sc}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Title block inputs */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <h4 className="font-semibold text-slate-200 flex items-center gap-2">
              <Building className="w-4 h-4 text-sky-400" />
              <span>{t.exportPro.titleBlock}</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Owner Name (Malik)</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Architect / Firm</label>
                <input
                  type="text"
                  value={designerName}
                  onChange={(e) => setDesignerName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSchedule}
                  onChange={(e) => setIncludeSchedule(e.target.checked)}
                  className="rounded border-slate-700 text-sky-600 focus:ring-0"
                />
                <span className="text-slate-300 font-medium">Room Schedule Table</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTitleBlock}
                  onChange={(e) => setIncludeTitleBlock(e.target.checked)}
                  className="rounded border-slate-700 text-sky-600 focus:ring-0"
                />
                <span className="text-slate-300 font-medium">Title Header Block</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeVehicleReport}
                  onChange={(e) => setIncludeVehicleReport(e.target.checked)}
                  className="rounded border-slate-700 text-sky-600 focus:ring-0"
                />
                <span className="text-slate-300 font-medium">Vehicle Access Report Page</span>
              </label>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <button
              onClick={handleExportPDF}
              className="p-3.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex flex-col items-center justify-center gap-2 shadow-lg shadow-sky-600/30 transition-all"
            >
              <FileDown className="w-5 h-5" />
              <span>{t.exportPro.exportPDF}</span>
            </button>

            <button
              onClick={handleExportDXF}
              className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-bold flex flex-col items-center justify-center gap-2 transition-all shadow-md"
            >
              <FileCode className="w-5 h-5 text-amber-400" />
              <span>{t.exportPro.exportDXF}</span>
            </button>

            <button
              onClick={handleExportSVG}
              className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-bold flex flex-col items-center justify-center gap-2 transition-all shadow-md"
            >
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>{t.exportPro.exportSVG}</span>
            </button>

            <button
              onClick={() => {
                if (stageRef.current) exportStageToPNG(stageRef.current, project.name);
                onClose();
              }}
              className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-purple-400 border border-slate-700 font-bold flex flex-col items-center justify-center gap-2 transition-all shadow-md"
            >
              <Image className="w-5 h-5 text-purple-400" />
              <span>Tasveer (PNG)</span>
            </button>

            {project.vehicleChecks && project.vehicleChecks.length > 0 && (
              <button
                onClick={handleExportVehicleReportOnly}
                className="col-span-2 sm:col-span-4 p-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 border border-emerald-500/40 text-emerald-400 font-bold flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>Vehicle Access & Clearance Report Only (PDF)</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer print action */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-800/40 flex items-center justify-between shrink-0">
          <span className="text-slate-400 text-[11px]">
            Ready for print or contractor dispatch
          </span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition-colors"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span>{t.exportPro.printView}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
