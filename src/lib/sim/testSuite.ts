export interface TestResultItem {
  name: string;
  category: string;
  status: 'PASS' | 'FAIL';
  metric: string;
  threshold: string;
  details: string;
  timestamp: string;
}

export interface TestSuiteSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number; // e.g. 100%
  executionTimeSec: number;
  results: TestResultItem[];
}
