import { Table, TableHead, TableRow, TableCell, TableBody } from "@midasit-dev/moaui"; 

const ComponentsTableBundle = ({ tableData }) => {
  return (
    <Table padding='normal'>
      <TableHead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
        <TableRow>
          <TableCell>Node</TableCell>
          <TableCell>Dx Stiffness</TableCell>
          <TableCell>Dy Stiffness</TableCell>
          <TableCell>Dz Stiffness</TableCell>
          <TableCell>Dx Disp</TableCell>
          <TableCell>Dy Disp</TableCell>
          <TableCell>Dz Disp</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
      {Object.entries(tableData).map(([node, data]) => (
        <TableRow key={node}>
          <TableCell>{node}</TableCell>
          <TableCell>{data?.Dx_Stiffness !== undefined ? data.Dx_Stiffness.toFixed(3) : "-"}</TableCell>
          <TableCell>{data?.Dy_Stiffness !== undefined ? data.Dy_Stiffness.toFixed(3) : "-"}</TableCell>
          <TableCell>{data?.Dz_Stiffness !== undefined ? data.Dz_Stiffness.toFixed(3) : "-"}</TableCell>
          <TableCell>{data?.Dx_Disp !== undefined ? data.Dx_Disp.toFixed(3) : "-"}</TableCell>
          <TableCell>{data?.Dy_Disp !== undefined ? data.Dy_Disp.toFixed(3) : "-"}</TableCell>
          <TableCell>{data?.Dz_Disp !== undefined ? data.Dz_Disp.toFixed(3) : "-"}</TableCell>
        </TableRow>
      ))}
    </TableBody>

    </Table>
  );
};

export default ComponentsTableBundle;
