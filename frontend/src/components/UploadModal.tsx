import React, { useState } from 'react';
import { X, UploadCloud, FileImage, Settings, AlertCircle, CheckCircle2 } from 'lucide-react';
import { uploadSonarFile } from '../services/api';
import { SonarProcessResponse } from '../types/sonar';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (data: SonarProcessResponse) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [altitudeM, setAltitudeM] = useState<number>(8.5);
  const [rangeScaleM, setRangeScaleM] = useState<number>(50.0);
  const [vesselSpeedKnots, setVesselSpeedKnots] = useState<number>(3.5);
  const [pingRateHz, setPingRateHz] = useState<number>(10.0);
  const [startLat, setStartLat] = useState<number>(18.9218);
  const [startLon, setStartLon] = useState<number>(72.8347);
  const [headingDeg, setHeadingDeg] = useState<number>(45.0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please select a sonar waterfall image file to upload.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('altitude_m', altitudeM.toString());
    formData.append('range_scale_m', rangeScaleM.toString());
    formData.append('vessel_speed_knots', vesselSpeedKnots.toString());
    formData.append('ping_rate_hz', pingRateHz.toString());
    formData.append('start_lat', startLat.toString());
    formData.append('start_lon', startLon.toString());
    formData.append('heading_deg', headingDeg.toString());

    try {
      const result = await uploadSonarFile(formData);
      onUploadSuccess(result);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload and process sonar record.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none font-mono text-xs">
      <div className="bg-sonar-900 border border-sonar-700 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-sonar-950 px-5 py-4 border-b border-sonar-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-sonar-teal" />
            <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider">
              Ingest Custom Sonar Waterfall
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-sonar-800 rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* File Selector */}
          <div className="border-2 border-dashed border-sonar-700 hover:border-sonar-cyan rounded-lg p-5 text-center bg-sonar-950/60 transition cursor-pointer">
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.tif,.tiff,.bmp"
              onChange={handleFileChange}
              className="hidden"
              id="sonar-file-input"
            />
            <label htmlFor="sonar-file-input" className="cursor-pointer space-y-2 block">
              <FileImage className="w-8 h-8 text-cyan-400 mx-auto" />
              <div className="text-slate-200 font-bold">
                {file ? file.name : 'Click to select Side-Scan Sonar strip (GeoTIFF / PNG / JPEG)'}
              </div>
              <p className="text-[11px] text-slate-400">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports single-channel 8-bit & 16-bit acoustic waterfall records'}
              </p>
            </label>
          </div>

          {/* Survey Telemetry Inputs */}
          <div className="bg-sonar-950 p-4 rounded-lg border border-sonar-800 space-y-3">
            <div className="text-slate-300 font-bold flex items-center gap-1.5 pb-1 border-b border-sonar-800">
              <Settings className="w-3.5 h-3.5 text-sonar-cyan" />
              <span>Survey Navigational Telemetry</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Towfish Altitude (m):</label>
                <input
                  type="number"
                  step="0.1"
                  value={altitudeM}
                  onChange={(e) => setAltitudeM(parseFloat(e.target.value))}
                  className="w-full bg-sonar-900 border border-sonar-700 rounded px-2.5 py-1 text-slate-100 focus:outline-none focus:border-sonar-cyan"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Range Scale (m/ch):</label>
                <input
                  type="number"
                  step="1"
                  value={rangeScaleM}
                  onChange={(e) => setRangeScaleM(parseFloat(e.target.value))}
                  className="w-full bg-sonar-900 border border-sonar-700 rounded px-2.5 py-1 text-slate-100 focus:outline-none focus:border-sonar-cyan"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Vessel Speed (knots):</label>
                <input
                  type="number"
                  step="0.1"
                  value={vesselSpeedKnots}
                  onChange={(e) => setVesselSpeedKnots(parseFloat(e.target.value))}
                  className="w-full bg-sonar-900 border border-sonar-700 rounded px-2.5 py-1 text-slate-100 focus:outline-none focus:border-sonar-cyan"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Heading (0-360°):</label>
                <input
                  type="number"
                  step="0.5"
                  value={headingDeg}
                  onChange={(e) => setHeadingDeg(parseFloat(e.target.value))}
                  className="w-full bg-sonar-900 border border-sonar-700 rounded px-2.5 py-1 text-slate-100 focus:outline-none focus:border-sonar-cyan"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Start Latitude:</label>
                <input
                  type="number"
                  step="0.0001"
                  value={startLat}
                  onChange={(e) => setStartLat(parseFloat(e.target.value))}
                  className="w-full bg-sonar-900 border border-sonar-700 rounded px-2.5 py-1 text-slate-100 focus:outline-none focus:border-sonar-cyan"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Start Longitude:</label>
                <input
                  type="number"
                  step="0.0001"
                  value={startLon}
                  onChange={(e) => setStartLon(parseFloat(e.target.value))}
                  className="w-full bg-sonar-900 border border-sonar-700 rounded px-2.5 py-1 text-slate-100 focus:outline-none focus:border-sonar-cyan"
                  required
                />
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 bg-red-950/60 border border-red-500/40 rounded text-red-300 text-[11px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-sonar-800 hover:bg-sonar-700 text-slate-300 rounded transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded transition flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>Processing Sonar...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Start AI Analysis</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
