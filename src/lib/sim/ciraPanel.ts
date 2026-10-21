export interface CiraNode {
  id: string;
  name: string;
  type: 'TRIGGER' | 'SOURCE' | 'MODEL' | 'OUTPUT';
  status: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'ERROR';
}

export interface CiraState {
  activeTab: 'Payload' | 'Output' | 'Image';
  latestPayloadText: string;
  latestOutputText: string;
  latestLabelTag: string; // e.g. "box_good-157 95%"
  pipelineRunning: boolean;
}

export const INITIAL_CIRA_STATE: CiraState = {
  activeTab: 'Image',
  latestPayloadText: JSON.stringify({ device: 'cira-edge-01', trigger: 'IR_BREAKBEAM_PIN_14' }, null, 2),
  latestOutputText: JSON.stringify({ class: 'box_good', id: 157, confidence: 0.95, boundingBox: [120, 80, 240, 210] }, null, 2),
  latestLabelTag: 'box_good-157 95%',
  pipelineRunning: false
};
