const CommandsGenerationMixin = (Base) =>
  class extends Base {
  /* ===================== Commands generation ===================== */
  generateCommands() {
    if (!this.currentRecordId) return;
    this.saveCurrentRecord();
    const record =
      this.projects[this.currentProjectId].records[this.currentRecordId];

    try {
      let createPointText = "";
      createPointText += "EA\n";
      createPointText += `${record.northing}\n`;
      createPointText += `${record.easting}\n`;
      createPointText += `${record.elevation}\n\n`;
      this.setCommandText("createPoint", createPointText);

      let occupyPointText = "";
      occupyPointText += "OCCPOINT\n";
      occupyPointText += `${record.startPtNum}\n`;
      occupyPointText += "N\n\n\n\n";
      this.setCommandText("occupyPoint", occupyPointText);

      const geometry = this.computeTraversePointsForRecord(
        this.currentProjectId,
        this.currentRecordId
      );
      const paths = geometry?.paths || [];
      const hasCalls = paths.some((p) => (p.calls || []).length > 0);

      let drawPointsText = "";
      if (!hasCalls) {
        drawPointsText = "(No traverse calls entered)\n";
      } else {
        paths.forEach((path, idx) => {
          if (!path.calls || path.calls.length === 0) return;
          const startLabel = path.startPointNumber ?? record.startPtNum ?? "";
          drawPointsText += `; Path ${idx + 1} from P${startLabel}\n`;
          drawPointsText += "T\n";
          path.calls.forEach((call) => {
            let parsed = null;
            try {
              parsed = this.parseBearing(call.bearing);
            } catch (e) {
              parsed = null;
            }
            if (!parsed) return;

            const startAzimuth = this.bearingToAzimuth(parsed);
            const curveMetrics = this.computeCurveMetrics(call, startAzimuth);
            const { segments } = this.buildCallSegments(
              call,
              startAzimuth,
              curveMetrics
            );
            if (!segments || segments.length === 0) return;

            if (curveMetrics) {
              const chordBearing =
                this.azimuthToQuadrantBearing(curveMetrics.chordBearingAzimuth) || {};
              const chordBearingLabel = chordBearing.quadrant
                ? `${chordBearing.quadrant}-${chordBearing.formatted}`
                : "";
              drawPointsText += `; Curve ${
                call.curveDirection || ""
              } R=${call.curveRadius || ""} Δ=${curveMetrics.deltaDegrees
                .toFixed(2)
                .replace(/\.00$/, "")}° Arc=${curveMetrics.arcLength
                .toFixed(2)
                .replace(/\.00$/, "")} Ch=${curveMetrics.chordLength
                .toFixed(2)
                .replace(/\.00$/, "")} Tan=${curveMetrics.tangentLength
                .toFixed(2)
                .replace(/\.00$/, "")} CB=${chordBearingLabel}\n`;
            }

            segments.forEach((segment) => {
              const bearing = this.azimuthToQuadrantBearing(segment.azimuth);
              drawPointsText += `${bearing.quadrant}\n`;
              drawPointsText += `${bearing.formatted}\n`;
              drawPointsText += `${segment.distance.toFixed(2)}\n`;
              drawPointsText += "0\n";
            });
          });
          drawPointsText += "E\n\n";
        });
      }
      this.setCommandText("drawPoints", drawPointsText.trimEnd() + "\n");

      let drawLinesText = "";
      if (!hasCalls) {
        drawLinesText = "(No traverse calls entered)\n";
      } else {
        paths.forEach((path, idx) => {
          if (!path.calls || path.calls.length === 0) return;
          const startLabel = path.startPointNumber ?? record.startPtNum ?? "";
          drawLinesText += `; Path ${idx + 1} from P${startLabel}\n`;
          drawLinesText += "L\n";
          drawLinesText += "P\n";
          drawLinesText += `${startLabel}\n`;
          path.calls.forEach((call) => {
            let parsed = null;
            try {
              parsed = this.parseBearing(call.bearing);
            } catch (e) {
              parsed = null;
            }
            if (!parsed) return;

            const startAzimuth = this.bearingToAzimuth(parsed);
            const curveMetrics = this.computeCurveMetrics(call, startAzimuth);
            const { segments } = this.buildCallSegments(
              call,
              startAzimuth,
              curveMetrics
            );
            if (!segments || segments.length === 0) return;

            if (curveMetrics) {
              const chordBearing =
                this.azimuthToQuadrantBearing(curveMetrics.chordBearingAzimuth) || {};
              const chordBearingLabel = chordBearing.quadrant
                ? `${chordBearing.quadrant}-${chordBearing.formatted}`
                : "";
              drawLinesText += `; Arc ${
                call.curveDirection || ""
              } R=${call.curveRadius || ""} Δ=${curveMetrics.deltaDegrees
                .toFixed(2)
                .replace(/\.00$/, "")}° Arc=${curveMetrics.arcLength
                .toFixed(2)
                .replace(/\.00$/, "")} Ch=${curveMetrics.chordLength
                .toFixed(2)
                .replace(/\.00$/, "")} Tan=${curveMetrics.tangentLength
                .toFixed(2)
                .replace(/\.00$/, "")} CB=${chordBearingLabel}\n`;
            }

            segments.forEach((segment) => {
              const bearing = this.azimuthToQuadrantBearing(segment.azimuth);
              drawLinesText += "D\n";
              drawLinesText += "F\n";
              drawLinesText += `${segment.distance.toFixed(2)}\n`;
              drawLinesText += "A\n";
              drawLinesText += `${bearing.quadrant}\n`;
              drawLinesText += `${bearing.formatted}\n`;
            });
          });
          drawLinesText += "Q\n\n";
        });
      }
      this.setCommandText("drawLines", drawLinesText.trimEnd() + "\n");

      this.drawTraversePreview(this.elements.traverseCanvas, geometry);
      this.renderClosureSummary?.(this.currentRecordId);

      this.updateAllBearingArrows();
      this.appControllers?.traverseSection?.renderRecords();
      this.updateProjectList();
      this.drawProjectOverview();
    } catch (e) {
      this.setCommandText("createPoint", "Error: " + e.message);
      this.setCommandText("occupyPoint", "");
      this.setCommandText("drawPoints", "");
      this.setCommandText("drawLines", "");
      const canvas = this.elements.traverseCanvas;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  handleResize() {
    this.drawProjectOverview();
    if (this.currentProjectId && this.currentRecordId) {
      const geometry = this.computeTraversePointsForRecord(
        this.currentProjectId,
        this.currentRecordId
      );
      this.drawTraversePreview(this.elements.traverseCanvas, geometry);
    }
  }
  };

export default CommandsGenerationMixin;
