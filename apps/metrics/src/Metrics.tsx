import * as M from "@mui/material";
import * as MR from "@maipl/react";
import * as R from "react";

export default function Metrics(props: null) {
  return (
    <M.Stack
      sx={{
        flexGrow: 1,
        maxHeight: "100%",
        overflow: "hidden",
        padding: 2,
        ...props.sx,
      }}
    >
      <M.Stack>
        <M.Stack>
            {/* Parameters input section */}
        </M.Stack>
      </M.Stack>
    </M.Stack>
  );
}
