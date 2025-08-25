import React, { useState, useEffect } from "react";
import { Panel,Typography, TextField, Button, Scrollbars, ChartLine, Grid } from "@midasit-dev/moaui"; 
import { DropList } from '@midasit-dev/moaui';
import { midasAPI } from "./Function/Common";
import  ComponentsTableBundle  from "./Function/ComponentsTableBundle";
import { iterativeResponseSpectrum } from "./utils_pyscript";
import { mapi_key } from "./utils_pyscript";
import { useSnackbar, SnackbarProvider } from "notistack";
import ComponentsIconAdd from "./Function/ComponentsIconAdd";
// import  LiveConvergencePlot from "./Components/LiveConvergencePlot";
import * as XLSX from 'xlsx';
// import { GuideBox, Alert } from "@midasit-dev/moaui";
// import ComponentsAlertError from "./Function/ComponentsAlertError";

let globalStructureGroups: { [key: number]: string } = {};
let globalBoundaryGroups: { [key: number]: string } = {};
let globalRsLoadCases: { [key: number]: string } = {};

interface NodeResult {
  Dx_Stiffness: number;
  Dy_Stiffness: number;
  Dz_Stiffness: number;
  Dx_Disp: number;
  Dy_Disp: number;
  Dz_Disp: number;
}

interface IterationResults {
  [node: string]: NodeResult;
}

type Results = {
  [iteration: string]: IterationResults;
};


const App = () => {
  // const [structureGroups, setStructureGroups] = useState<Map<string, number>>(new Map());
  const [boundaryGroups, setBoundaryGroups] = useState<Map<string, number>>(new Map());
  const [rsLoadCases, setRsLoadCases] = useState<Map<string, number>>(new Map());
  const [selectedStructureGroup, setSelectedStructureGroup] = useState("");
  const [selectedBoundaryGroup, setSelectedBoundaryGroup] = useState("");
  const [selectedRsLoadCase, setSelectedRsLoadCase] = useState("");
  const [tolerance, setTolerance] = useState("0.01");
  const [iterations, setIterations] = useState<Map<string, number>>(new Map());
  const [results, setResults] = useState<Results>({});
	const [tableData, setTableData] = useState<IterationResults>({});
  const [selectedIteration, setSelectedIteration] = useState<string | null>(null);
	const [logData, setLogData] = useState<Array<[number, number, number]>>([]); //
  // const [data, setData] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const [csvData, setCsvData] = useState<string>("");
  // Fetch data for dropdowns
  const [triggerFetch, setTriggerFetch] = useState<boolean>(false);

	const convergencePlotData = logData.length > 0
  ? [{
      id: "convergence",
      color: "blue",
      data: logData.map(([iteration, , maxRatio]) => ({ x: iteration, y: maxRatio })),
    }]
  : [];

  const resetAndFetchData = () => {
	  // Reset state variables
	//   setStructureGroups(new Map());
	  setBoundaryGroups(new Map());
	  setRsLoadCases(new Map());
	  setIterations(new Map());
	  setSelectedIteration(null);
	  setResults({});
	  setTableData({});
	  setCsvData("");
		setLogData([]);
	  // Trigger fetch
	  setTriggerFetch(prev => !prev);
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        // const structureResponse = await midasAPI("GET","/db/GRUP",{});
        const boundaryResponse = await midasAPI("GET","/db/BNGR",{});
        const rsLoadCaseResponse = await midasAPI("GET","/db/SPLC",{});
		// const grupData = structureResponse.GRUP;
        const bngData = boundaryResponse.BNGR;
		const splcData = rsLoadCaseResponse.SPLC;
        // const mappedItems = new Map<string, number>(
		// // 	Object.keys(grupData).map((key) => {
		// // 	  const group = grupData[key];
		// // 	  return [group.NAME, parseInt(key)];  // You can adjust this as needed
		// // 	})
		// //   );
		  const mappedItems_bng = new Map<string, number>(
			Object.keys(bngData).map((key) => {
			  const group = bngData[key];
			  return [group.NAME, parseInt(key)];  // You can adjust this as needed
			})
		  );
		  const mappedItems_splc = new Map<string, number>(
			Object.keys(splcData).map((key) => {
			  const group = splcData[key];
			  return [group.NAME, parseInt(key)];  // You can adjust this as needed
			})
		  );
		//  globalStructureGroups = Object.keys(grupData).reduce((acc, key) => {
        //   acc[parseInt(key)] = grupData[key].NAME;
        //   return acc;
        // }, {} as { [key: number]: string });

        globalBoundaryGroups = Object.keys(bngData).reduce((acc, key) => {
          acc[parseInt(key)] = bngData[key].NAME;
          return acc;
        }, {} as { [key: number]: string });

        globalRsLoadCases = Object.keys(splcData).reduce((acc, key) => {
          acc[parseInt(key)] = splcData[key].NAME;
          return acc;
        }, {} as { [key: number]: string });
        // setStructureGroups(mappedItems);
        setBoundaryGroups(mappedItems_bng);   
        setRsLoadCases(mappedItems_splc);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [triggerFetch]);    
  
 
  // Update table when iteration changes
 useEffect(() => {
  if (selectedIteration && results[selectedIteration]) {
    setTableData(results[selectedIteration]);

    // Build CSV with both stiffness + displacement
    const csvRows = [
      ["Node", "Dx_Stiffness", "Dy_Stiffness", "Dz_Stiffness", "Dx_Disp", "Dy_Disp", "Dz_Disp"],
      ...Object.entries(results[selectedIteration]).map(([node, data]) => [
        node,
        data.Dx_Stiffness, data.Dy_Stiffness, data.Dz_Stiffness,
        data.Dx_Disp, data.Dy_Disp, data.Dz_Disp
      ])
    ];
    const csvString = csvRows.map(row => row.join("\t")).join("\n");
    setCsvData(csvString);
  }
}, [selectedIteration, results]);

  function onChangeHandler_sg(event: any){
	setSelectedStructureGroup(event.target.value);
}
function onChangeHandler_bn(event: any){
	setSelectedBoundaryGroup(event.target.value);
}
function onChangeHandler_rs(event: any){
	setSelectedRsLoadCase(event.target.value);
}
function onChangeHandler_ir(event: any){
	setSelectedIteration(event.target.value);
}

const handleRunAnalysis = async () => {
  try {
    if (!selectedBoundaryGroup && !selectedRsLoadCase) {
      enqueueSnackbar(
        "Please select the required boundary group and Load Case before running the analysis.",
        { variant: "error", anchorOrigin: { vertical: "top", horizontal: "center" } }
      );
      return;
    }

    if (!selectedBoundaryGroup) {
      enqueueSnackbar("Please select the required Boundary Group before running the analysis.", {
        variant: "error",
        anchorOrigin: { vertical: "top", horizontal: "center" },
      });
      return;
    }
    if (!selectedRsLoadCase) {
      enqueueSnackbar("Please select the required Load Case before running the analysis.", {
        variant: "error",
        anchorOrigin: { vertical: "top", horizontal: "center" },
      });
      return;
    }
    if (tolerance === "" || isNaN(parseFloat(tolerance))) {
      enqueueSnackbar("Please enter a valid tolerance value.", {
        variant: "error",
        anchorOrigin: { vertical: "top", horizontal: "center" },
      });
      return;
    }

    enqueueSnackbar("Please wait while running analysis...", {
      variant: "info",
      anchorOrigin: { vertical: "top", horizontal: "center" },
    });

    setTimeout(async () => {
      try {
        const result = await iterativeResponseSpectrum(
          globalBoundaryGroups[parseInt(selectedBoundaryGroup)],
          globalRsLoadCases[parseInt(selectedRsLoadCase)],
          parseFloat(tolerance),
          mapi_key
        );

        // 🔥 reshape flat array into iteration → node → data
        const groupedResults: Results = {};
        result.table.forEach((row: any) => {
          const iter = String(row.iteration);
          const node = String(row.node);
          if (!groupedResults[iter]) groupedResults[iter] = {};
          groupedResults[iter][node] = {
            Dx_Stiffness: row.Dx_Stiffness,
            Dy_Stiffness: row.Dy_Stiffness,
            Dz_Stiffness: row.Dz_Stiffness,
            Dx_Disp: row.Dx_Disp,
            Dy_Disp: row.Dy_Disp,
            Dz_Disp: row.Dz_Disp,
          };
        });

        setResults(groupedResults);
        setLogData(result.log);

        // pick first iteration as default
        const firstIteration = Object.keys(groupedResults)[0] || null;
        setSelectedIteration(firstIteration);

        // build dropdown map
        const mappedIterations = new Map(
          Object.keys(groupedResults).map((iter) => [iter, parseInt(iter)])
        );
        setIterations(mappedIterations);

        console.log("Mapped iterations:", mappedIterations);
        console.log("Analysis results:", groupedResults);

        enqueueSnackbar("Analysis completed successfully!", {
          variant: "success",
          anchorOrigin: { vertical: "top", horizontal: "center" },
        });
      } catch (error) {
        enqueueSnackbar("Error while running analysis!", {
          variant: "error",
          anchorOrigin: { vertical: "top", horizontal: "center" },
        });
        console.error("Error running analysis:", error);
      }
    }, 0);
  } catch (error) {
    enqueueSnackbar("Error while running analysis!", {
      variant: "error",
      anchorOrigin: { vertical: "top", horizontal: "center" },
    });
    console.error("Error running analysis:", error);
  }
};

  const handleDownload = () => {
	// Process the downloaded Excel file
	if (Object.keys(results).length === 0) {
		enqueueSnackbar("Please run analysis first.", {
			variant: "warning",
			anchorOrigin: { vertical: "top", horizontal: "center" },
		});
		return;
	}
	// const workbook = XLSX.utils.book_new();
    // const worksheetData = [["Key", "Dx", "Dy", "Dz"]]; // Header row

	// Object.keys(results).forEach(iteration => {
    //     const iterationResults = results[iteration];
    //     Object.keys(iterationResults).forEach(key => {
    //         const displacement = iterationResults[key];
    //         worksheetData.push([
    //             key,
    //             displacement.Dx !== undefined ? displacement.Dx : 0,
    //             displacement.Dy !== undefined ? displacement.Dy : 0,
    //             displacement.Dz !== undefined ? displacement.Dz : 0,
    //         ]);
    //     });
    // });

    // const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    // XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

	// 	// Generate the modified Excel file and create a Blob object
	// 	const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
	// 	const modifiedBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });

	// 	// Trigger the download of the modified Excel file
	// 	const link = document.createElement('a');
	// 	link.href = URL.createObjectURL(modifiedBlob);
	// 	link.download = 'Iterations_result.xlsx';
	// 	document.body.appendChild(link);
	// 	link.click();
	// 	document.body.removeChild(link);
	
};

  return (
    <Panel width="1220px" height="460px" marginTop={3}>
		<Panel width="1220px" height="50px" variant="box">
		<Typography variant="h1" color="primary" center={true} size="large">
      Iterative Response Spectrum
    </Typography>
		</Panel>
			<Panel width="1210px" height="430px" variant="box" flexItem flexDirection={"row"} >
				<Panel width="250px" height="430px" variant="box" >
			{/* <Panel width="250px" height="80px" variant="strock" >
			<Typography>Select Structure Group</Typography>
			<div style={{ marginTop: '10px' }}>
			<DropList 
			itemList={structureGroups} 
			width="220px" 
			defaultValue="Korean"
			value={selectedStructureGroup}
			onChange={onChangeHandler_sg}  
		/>
		  </div>
		</Panel> */}
		<Panel width="250px" height="90px" variant="strock" marginTop={0}>
		<Typography marginTop={1} variant="body2">Select Boundary Group</Typography>
		<div style={{ marginTop: '15px' }}>
		<DropList 
			itemList={boundaryGroups} 
			width="220px" 
			defaultValue="Korean"
			value={selectedBoundaryGroup}
			onChange={onChangeHandler_bn}  
		/>
	</div>
		</Panel>
		<Panel width="250px" height="90px" variant="strock"marginTop={1} >
		<Typography marginTop={1} variant="body2">Select Response Spectrum Load Case</Typography>
		<div style={{ marginTop: '15px' }}>
		<DropList 
			itemList={rsLoadCases} 
			width="220px" 
			defaultValue="Korean"
			value={selectedRsLoadCase}
			onChange={onChangeHandler_rs}  
		/> </div>
		</Panel>
		<Panel width="250px" height="90px" variant="strock" marginTop={1}>
		<Typography marginTop={1} variant="body2">Tolerance (0.01 to 0.05) </Typography>
		<div style={{ marginTop: '15px' }}>
		<TextField 
			width="220px"
			placeholder=""
			title=""
			titlePosition="left"
			disabled={false}
			defaultValue=""
			value={tolerance}
			onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
				const value = e.target.value;
				if (value === '' || !isNaN(parseFloat(value))) {
					setTolerance(value);
				}
			}}
			error={false}
		/> 
		</div>
		</Panel>
		<Panel flexItem  justifyContent = 'space-between' width="240px" height="80px" variant="box" marginTop={1} marginLeft={1}>
		<Button
  color="normal"
  onClick={handleRunAnalysis}
  width="auto" 
>
Run Analysis
</Button> 
<div style={{width : "10px"}}></div>
<Button
  color="normal"
  onClick={resetAndFetchData} 
  width="auto" 
>
Refresh
</Button> 
</Panel>
</Panel>
<Panel width="570px" height="380px" variant="strock" marginX="20px" marginRight={0}>
  <Grid container direction="column" spacing={0}>
    
    {/* Row 1: Results + Download icon */}
    <Grid item>
      <Grid container alignItems="start" >
        <Grid item marginLeft={1} >
          <Typography variant="h1" marginTop={1} >Results</Typography>
        </Grid>
        <Grid item marginLeft={59} >
          <ComponentsIconAdd results={results} logData={logData} onDownload={handleDownload} />
        </Grid>
      </Grid>
    </Grid>

    {/* Row 2: Iteration Dropdown */}
    <Grid item>
      <Panel width="550px" height="60px" variant="box" marginTop={0}>
        <Typography variant="body2">Select Iteration step</Typography>
        <div style={{ marginTop: "6px" }}>
          <DropList
            itemList={iterations}
            width="539px"
            value={selectedIteration}
            onChange={onChangeHandler_ir}
          />
        </div>
      </Panel>
    </Grid>

    {/* Row 3: Table */}
    <Grid item>
      <Panel width="550px" height="330px" variant="box" marginRight="5px">
        <Scrollbars width="538px" height="245px">
          <ComponentsTableBundle tableData={tableData} />
        </Scrollbars>
      </Panel>
    </Grid>

  </Grid>
</Panel>

<Panel width="450px" height="380px" variant="strock" marginX="10px">
	<Typography variant="h1" center={true} color="primary">Convergence Plot</Typography>
  <div style={{ width: "100%", height: "360px", position: "relative" }}>
    <ChartLine
      data={convergencePlotData}
      axisBottom
      axisBottomTickValues={
        convergencePlotData.length > 0
          ? Math.min(convergencePlotData[0].data.length) // ≤10 ticks
          : 5
      }
      axisBottomDecimals={0}
      axisBottomLegend="Iteration"
      axisLeft
      axisLeftTickValues={10}
      axisLeftDecimals={2}
      axisLeftLegend="Max Ratio Diff"
      width="100%"
      height="100%"
      pointSize={2}
      marginTop={20}
      marginRight={25}
      marginLeft={50}
      marginBottom={55}
    />
  </div>
</Panel>

		</Panel>
	</Panel>
  );
};
export default App;
