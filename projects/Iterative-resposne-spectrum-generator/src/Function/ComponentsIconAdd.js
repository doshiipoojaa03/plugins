import { Icon } from "@midasit-dev/moaui";
import React from 'react';
import * as XLSX from 'xlsx';
import { useSnackbar, SnackbarProvider } from "notistack";
const ComponentsIconAdd = ({ results, logData, onDownload }) => {
    const { enqueueSnackbar } = useSnackbar();
    const handleIconClick = () => {
  if (Object.keys(results).length === 0) {
    enqueueSnackbar("Please run analysis first.", {
      variant: "warning",
      anchorOrigin: { vertical: "top", horizontal: "center" },
    });
    return;
  }
  if (!logData || logData.length === 0) {
    enqueueSnackbar("No log data found, only iteration results will be exported.", {
      variant: "info",
      anchorOrigin: { vertical: "top", horizontal: "center" },
    });
  }

  const workbook = XLSX.utils.book_new();

  // 🔹 Iteration results (keep one sheet per iteration)
  Object.keys(results).forEach(iteration => {
    const data = [
      ["Node", "Dx_Stiffness", "Dy_Stiffness", "Dz_Stiffness", "Dx_Disp", "Dy_Disp", "Dz_Disp"],
      ...Object.entries(results[iteration]).map(([node, res]) => [
        node,
        res.Dx_Stiffness?.toFixed(4) ?? "0.0000",
        res.Dy_Stiffness?.toFixed(4) ?? "0.0000",
        res.Dz_Stiffness?.toFixed(4) ?? "0.0000",
        res.Dx_Disp?.toFixed(4) ?? "0.0000",
        res.Dy_Disp?.toFixed(4) ?? "0.0000",
        res.Dz_Disp?.toFixed(4) ?? "0.0000",
      ])
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, `Iteration ${iteration}`);
  });

  // 🔹 Convergence log sheet
  if (logData && logData.length > 0) {
    const logSheetData = [
      ["Iteration", "Node", "Max Ratio Difference"],
      ...logData.map(([iteration, node, maxDiff]) => [iteration, node, maxDiff]),
    ];
    const logSheet = XLSX.utils.aoa_to_sheet(logSheetData);
    XLSX.utils.book_append_sheet(workbook, logSheet, "ConvergenceLog");
  }

  // Download combined workbook
  XLSX.writeFile(workbook, "AnalysisResults.xlsx");

  // optional callback
  if (onDownload) {
    onDownload();
  }
};
    return (
        <div onClick={handleIconClick} style={{ cursor: 'pointer' }}>
            <Icon iconName="GetApp" />
        </div>
    );
};

export default ComponentsIconAdd;