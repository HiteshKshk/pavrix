import { serve } from "inngest/next";
import { inngest } from "../../../lib/inngest/client";
import { pipelineJob } from "../../../lib/inngest/jobs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    pipelineJob,
  ],
});
