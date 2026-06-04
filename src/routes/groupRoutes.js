import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { 
  getGroupById, 
  getGroupByShareCode,
  getUserGroups,
  createGroup,
  joinGroup,
  leaveGroup,
  deleteGroup,
  updateGroup,
  kickMember,
  updateMemberRole,
  addGroupResource,
  deleteGroupResource,
  addMission,
  updateMission,
  deleteMission
} from "../controllers/groupController.js";

const router = express.Router();

router.use(verifyToken);

// List user's groups
router.get("/", getUserGroups);

// Create group
router.post("/", createGroup);

// Join group
router.post("/join", joinGroup);

// Leave group
router.post("/:id/leave", leaveGroup);

// Delete group
router.delete("/:id", deleteGroup);

// Update group (settings / custom roles)
router.patch("/:id", updateGroup);

// Kick member
router.post("/:id/kick/:memberUserId", kickMember);

// Member role update
router.post("/:id/members/:memberUserId/role", updateMemberRole);

// Group resources (characters, NPCs, journals)
router.post("/:id/resources", addGroupResource);
router.delete("/:id/resources/:resourceId", deleteGroupResource);

// Group missions
router.post("/:id/missions", addMission);
router.patch("/:id/missions/:missionId", updateMission);
router.delete("/:id/missions/:missionId", deleteMission);

// Get group by ID
router.get("/:id", getGroupById);

// Get group by share code
router.get("/share/:code", getGroupByShareCode);

export default router;
