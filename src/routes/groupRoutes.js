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
  deleteMission,
  listTarotCards,
  updateGroupResource
} from "../controllers/groupController.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", getUserGroups);

router.get("/tarot-cards", listTarotCards);

router.post("/", createGroup);

router.post("/join", joinGroup);

router.post("/:id/leave", leaveGroup);

router.delete("/:id", deleteGroup);

router.patch("/:id", updateGroup);

router.post("/:id/kick/:memberUserId", kickMember);

router.post("/:id/members/:memberUserId/role", updateMemberRole);

router.post("/:id/resources", addGroupResource);
router.patch("/:id/resources/:resourceId", updateGroupResource);
router.delete("/:id/resources/:resourceId", deleteGroupResource);

router.post("/:id/missions", addMission);
router.patch("/:id/missions/:missionId", updateMission);
router.delete("/:id/missions/:missionId", deleteMission);

router.get("/:id", getGroupById);

router.get("/share/:code", getGroupByShareCode);

export default router;
