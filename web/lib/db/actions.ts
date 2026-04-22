// Barrel re-export — all existing `import { ... } from '@/lib/db/actions'` continue working.

export { requireUser } from "./actions/auth";

export {
  getFiles,
  getFile,
  saveFile,
  deleteFile,
  reextractReport,
  updateFileBiomarkers,
  updateReportInfo,
} from "./actions/reports";

export {
  getSettings,
  updateSettings,
  getSettingsSafe,
  updateSettingsSafe,
} from "./actions/settings";

export {
  getBiomarkerDetail,
  getReferenceRange,
  reconcileReferenceRanges,
  updateReferenceRange,
  backfillReferenceRange,
} from "./actions/biomarkers";

export { deleteAccount } from "./actions/account";

export {
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from "./actions/api-keys";

export {
  createDoctorShare,
  listDoctorShares,
  revokeDoctorShare,
  validateShareAccess,
  getShareByToken,
  getSharedBiomarkerList,
  getSharedBiomarkerDetail,
} from "./actions/doctor-shares";

export {
  getGoals,
  createGoal,
  updateGoalTarget,
  deleteGoal,
  reorderGoals,
  getGoalChartData,
} from "./actions/goals";

export {
  getDashboards,
  getDashboard,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  addDashboardItem,
  removeDashboardItem,
  reorderDashboards,
  reorderDashboardItems,
  getDashboardChartData,
  groupDashboardItems,
  ungroupDashboardItems,
} from "./actions/dashboards";
