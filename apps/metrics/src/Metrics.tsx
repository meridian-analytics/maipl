import { File } from "@maipl/api";
import * as M from "@mui/material";
import * as MR from "@maipl/react";
import * as R from "react";

const optionsInit = {
  clips: true,
  threshold_min: 0.0,
  threshold_max: 1.0,
  threshold_inc: 0.05,
  total_time_units: 0,
};

const textFieldStyle = { width: "120px" };
const fileSelectStyle = { width: "940px" };

export default function Metrics(props: null) {
  // State
  const [refFile, setRefFile] = R.useState<number>(-1);
  const [evalFile, setEvalFile] = R.useState<number>(-1);
  const [options, setOptions] = R.useState(optionsInit);
  const [output, setOutput] = R.useState<string>("output");
  const [addRef, setAddRef] = R.useState<boolean>(false);

  const {
    debouncedFilter,
    filter,
    folder,
    pagination,
    selection,
    setFolder,
    setPagination,
    setSelection,
  } = MR.Files.useTable();

  // Load models
  const { data: annotations } = MR.Files.useQuery({
    maipl_folder: File.t_maipl_folder.annotation,
    page: 1,
    size: 100,
  });
  const { data: files } = MR.Files.useQuery({
    maipl_folder: File.t_maipl_folder.raw,
    path: debouncedFilter.get("path"),
    tag: debouncedFilter.get("tag"),
    page: pagination.pageIndex + 1,
    size: pagination.pageSize,
  });

  // Submit
  const onSubmit = () => {};

  return (
    <M.Stack
      sx={{
        flexGrow: 1,
        maxHeight: "100%",
        overflow: "hidden",
        px: 10,
        pt: 5,
        ...props.sx,
      }}
    >
      <M.Stack style={fileSelectStyle}>
        {/* file select section */}
        <M.FormControl required>
          <M.InputLabel>Evaluation</M.InputLabel>
          <M.Select
            label='Model'
            onChange={(e) => setEvalFile(e.target.value as number)}
            value={evalFile}
          >
            <M.MenuItem value={-1} children='Choose evaluation ...' />
            {annotations.data
              .sort((a, b) => a.path.localeCompare(b.path))
              .map((m) => (
                <M.MenuItem key={m.file} value={m.id}>
                  {m.path}
                </M.MenuItem>
              ))}
          </M.Select>
        </M.FormControl>
        <M.FormControl required>
          <M.InputLabel>Reference</M.InputLabel>
          <M.Select
            label='Model'
            onChange={(e) => setRefFile(e.target.value as number)}
            value={refFile}
          >
            <M.MenuItem value={-1} children='Choose evaluation ...' />
            {annotations.data
              .sort((a, b) => a.path.localeCompare(b.path))
              .map((m) => (
                <M.MenuItem key={m.file} value={m.id}>
                  {m.path}
                </M.MenuItem>
              ))}
          </M.Select>
        </M.FormControl>
      </M.Stack>
      <M.Stack direction='row'>
        {/* options section */}
        <M.TextField
          label='Output Folder'
          onChange={(e) => setOutput(e.target.value)}
          value={output}
          required
          style={textFieldStyle}
        />
        <M.TextField
          label='Threshold min'
          onChange={(e) =>
            setOptions({ ...options, threshold_min: e.target.value })
          }
          type='number'
          value={options.threshold_min}
          style={textFieldStyle}
        />
        <M.TextField
          label='Threshold max'
          onChange={(e) =>
            setOptions({ ...options, threshold_max: e.target.value })
          }
          type='number'
          value={options.threshold_max}
          style={textFieldStyle}
        />
        <M.TextField
          label='Threshold inc'
          onChange={(e) =>
            setOptions({ ...options, threshold_inc: e.target.value })
          }
          type='number'
          value={options.threshold_inc}
          style={textFieldStyle}
        />
        <M.TextField
          label='Total time units'
          onChange={(e) =>
            setOptions({ ...options, total_time_units: e.target.value })
          }
          type='number'
          value={options.total_time_units}
          style={textFieldStyle}
        />
        <M.FormControlLabel
          style={textFieldStyle}
          control={
            <M.Switch
              checked={options.clips}
              onChange={(e) =>
                setOptions({ ...options, clips: e.target.checked })
              }
              name='clips'
            />
          }
          label={options.clips ? "Clips" : "Continuous"}
        />
        <M.Button
          children='Submit'
          disabled={refFile === -1 || evalFile === -1 || output === ""}
          onClick={onSubmit}
          variant='contained'
          style={textFieldStyle}
        />
      </M.Stack>
      <M.Divider />
      <M.Stack>
        {/* Add background reference section */}
        <M.Stack direction='row' height='30px'>
          <M.FormControlLabel
            control={
              <M.Switch
                checked={addRef}
                onChange={(e) => setAddRef(e.target.checked)}
                name='addRef'
              />
            }
            label='Add background reference'
          />
          {addRef && (
            <M.TextField
              label='Filter by Path ...'
              onChange={(e) => filter.set("path", e.currentTarget.value)}
              value={filter.get("path")}
            />
          )}
          {addRef && (
            <M.TextField
              label='Filber by Tag ...'
              onChange={(e) => filter.set("tag", e.currentTarget.value)}
              value={filter.get("tag")}
            />
          )}
        </M.Stack>
        {addRef && (
          <MR.Files.Table
            rows={files.data}
            count={files.count}
            pagination={pagination}
            selection={selection}
            setPagination={setPagination}
            setSelection={setSelection}
            visibility={{
              basename: false,
              dirname: false,
              extname: false,
              channels: false,
              sample_rate: false,
              created_at: true,
            }}
          />
        )}
      </M.Stack>
    </M.Stack>
  );
}
