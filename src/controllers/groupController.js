import supabase from "../utils/db.js";

const generateSilaneGroupId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const generateShareCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const generateMissionId = () => {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
};

const hydrateGroupResources = async (resources) => {
  const safeRes = Array.isArray(resources) ? resources : [];
  const tarotIds = [];
  safeRes.forEach(r => {
    if (Array.isArray(r.tarot_ids) && r.tarot_ids.length > 0) {
      tarotIds.push(...r.tarot_ids);
    }
  });

  const uniqueTarotIds = [...new Set(tarotIds)];
  let tarotMap = {};

  if (uniqueTarotIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from("tarot_card")
        .select("id, name, type, image, description")
        .in("id", uniqueTarotIds);
      if (!error && data) {
        tarotMap = Object.fromEntries(data.map(c => [String(c.id), c]));
      }
    } catch (e) {
      console.error("❌ Failed to hydrate tarot cards:", e);
    }
  }

  return safeRes.map(r => {
    let tarotData = [];
    if (Array.isArray(r.tarot_ids)) {
      tarotData = r.tarot_ids
        .map(id => tarotMap[String(id)] || null)
        .filter(Boolean);
    }
    return {
      ...r,
      tarot_card: tarotData
    };
  });
};

export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, description, color, icon, share_code, members, resources, missions, max_members, creator_name, creator_id, created_at, roles, friend_invite_enabled, tarot_card")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return res.status(404).json({ success: false, message: "Group not found" });
      throw error;
    }

    if (data) {
      data.resources = await hydrateGroupResources(data.resources);
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error("❌ getGroupById:", err);
    return res.status(500).json({ success: false, message: "Failed to get group" });
  }
};

export const getGroupByShareCode = async (req, res) => {
  try {
    const { code } = req.params;
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, description, color, icon, share_code, members, resources, missions, max_members, creator_name, creator_id, created_at, roles, friend_invite_enabled, tarot_card")
      .eq("share_code", code)
      .single();

    if (error) {
      if (error.code === "PGRST116") return res.status(404).json({ success: false, message: "Group not found" });
      throw error;
    }

    if (data) {
      data.resources = await hydrateGroupResources(data.resources);
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error("❌ getGroupByShareCode:", err);
    return res.status(500).json({ success: false, message: "Failed to get group" });
  }
};

export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { data, error } = await supabase
      .from("groups")
      .select("id, name, description, color, icon, share_code, members, resources, missions, max_members, creator_name, creator_id, created_at, roles, friend_invite_enabled, tarot_card");

    if (error) throw error;

    const allGroups = data || [];
    const owned = allGroups.filter(g => String(g.creator_id) === String(userId));
    const member = allGroups.filter(g => {
      if (String(g.creator_id) === String(userId)) return false;
      const members = Array.isArray(g.members) ? g.members : [];
      return members.some(m => String(m.user_id) === String(userId));
    });

    for (const g of owned) {
      g.resources = await hydrateGroupResources(g.resources);
    }
    for (const g of member) {
      g.resources = await hydrateGroupResources(g.resources);
    }

    return res.json({ success: true, owned, member });
  } catch (err) {
    console.error("❌ getUserGroups:", err);
    return res.status(500).json({ success: false, message: "Failed to get groups" });
  }
};

export const createGroup = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userName = req.user?.username || "Unknown";
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { name, description, color, password } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "name is required" });
    }

    const shareCode = generateShareCode();
    const silaneGroupId = generateSilaneGroupId();

    const payload = {
      silane_group_id: silaneGroupId,
      name: name.trim(),
      description: description ? description.trim() : null,
      color: color || "#6366f1",
      icon: null,
      share_code: shareCode,
      creator_id: String(userId),
      creator_name: userName,
      max_members: 12,
      members: [
        { user_id: String(userId), name: userName, role: "Owner" }
      ],
      resources: [],
      missions: [],
      roles: [
        { name: "Owner", permissions: ["manage_group", "invite", "kick"] },
        { name: "Member", permissions: ["view"] }
      ],
      password: password && password.trim() ? password.trim() : null
    };

    const { data, error } = await supabase
      .from("groups")
      .insert([payload])
      .select("id, name, description, color, icon, share_code, members, resources, missions, max_members, creator_name, creator_id, created_at, friend_invite_enabled, tarot_card")
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("❌ createGroup:", err);
    return res.status(500).json({ success: false, message: "Failed to create group" });
  }
};

export const joinGroup = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userName = req.user?.username || "Unknown";
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { code, password } = req.body;
    const cleanCode = String(code || "").trim();
    if (!cleanCode) return res.status(400).json({ success: false, message: "Invite code is required" });

    const { data: group, error: fetchErr } = await supabase
      .from("groups")
      .select("*")
      .or(`share_code.eq.${cleanCode},silane_group_id.eq.${cleanCode}`)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    if (group.password) {
      if (String(password || "").trim() !== String(group.password).trim()) {
        return res.status(403).json({ success: false, message: "Invalid password" });
      }
    }

    const members = Array.isArray(group.members) ? group.members : [];
    const isAlreadyMember = members.some(m => String(m.user_id) === String(userId));
    if (isAlreadyMember) {
      group.resources = await hydrateGroupResources(group.resources);
      return res.json({ success: true, message: "Already a member", data: group });
    }

    const max = Number(group.max_members || 12);
    if (members.length >= max) {
      return res.status(400).json({ success: false, message: "Group is full" });
    }

    const nextMembers = [...members, { user_id: String(userId), name: userName, role: "Member" }];

    const { data: updatedGroup, error: updateErr } = await supabase
      .from("groups")
      .update({ members: nextMembers })
      .eq("id", group.id)
      .select("id, name, description, color, icon, share_code, members, resources, missions, max_members, creator_name, creator_id, created_at, friend_invite_enabled, tarot_card")
      .single();

    if (updateErr) throw updateErr;

    if (updatedGroup) {
      updatedGroup.resources = await hydrateGroupResources(updatedGroup.resources);
    }

    return res.json({ success: true, message: "Joined successfully", data: updatedGroup });
  } catch (err) {
    console.error("❌ joinGroup:", err);
    return res.status(500).json({ success: false, message: "Failed to join group" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id } = req.params;
    const { data: group, error: fetchErr } = await supabase
      .from("groups")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr) {
      if (fetchErr.code === "PGRST116") return res.status(404).json({ success: false, message: "Group not found" });
      throw fetchErr;
    }

    if (String(group.creator_id) === String(userId)) {
      return res.status(400).json({ success: false, message: "Owner cannot leave group, transfer ownership or delete it instead" });
    }

    const members = Array.isArray(group.members) ? group.members : [];
    const nextMembers = members.filter(m => String(m.user_id) !== String(userId));

    const { error: updateErr } = await supabase
      .from("groups")
      .update({ members: nextMembers })
      .eq("id", id);

    if (updateErr) throw updateErr;

    return res.json({ success: true, message: "Left group successfully" });
  } catch (err) {
    console.error("❌ leaveGroup:", err);
    return res.status(500).json({ success: false, message: "Failed to leave group" });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id } = req.params;
    const { data: group, error: fetchErr } = await supabase
      .from("groups")
      .select("creator_id")
      .eq("id", id)
      .single();

    if (fetchErr) {
      if (fetchErr.code === "PGRST116") return res.status(404).json({ success: false, message: "Group not found" });
      throw fetchErr;
    }

    if (String(group.creator_id) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Only the owner can delete this group" });
    }

    const { error: deleteErr } = await supabase
      .from("groups")
      .delete()
      .eq("id", id);

    if (deleteErr) throw deleteErr;

    return res.json({ success: true, message: "Group deleted successfully" });
  } catch (err) {
    console.error("❌ deleteGroup:", err);
    return res.status(500).json({ success: false, message: "Failed to delete group" });
  }
};

export const kickMember = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id, memberUserId } = req.params;
    const { data: group, error: fetchErr } = await supabase
      .from("groups")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr) {
      if (fetchErr.code === "PGRST116") return res.status(404).json({ success: false, message: "Group not found" });
      throw fetchErr;
    }

    if (String(group.creator_id) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Only the owner can kick members" });
    }

    const members = Array.isArray(group.members) ? group.members : [];
    const nextMembers = members.filter(m => String(m.user_id) !== String(memberUserId));

    const { error: updateErr } = await supabase
      .from("groups")
      .update({ members: nextMembers })
      .eq("id", id);

    if (updateErr) throw updateErr;

    return res.json({ success: true, message: "Member kicked successfully" });
  } catch (err) {
    console.error("❌ kickMember:", err);
    return res.status(500).json({ success: false, message: "Failed to kick member" });
  }
};

export const updateMemberRole = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id, memberUserId } = req.params;
    const { role } = req.body;

    if (!role) return res.status(400).json({ success: false, message: "Role is required" });

    const { data: group, error: fetchErr } = await supabase
      .from("groups")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr) throw fetchErr;

    if (String(group.creator_id) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Only the owner can update roles" });
    }

    if (String(memberUserId) === String(group.creator_id)) {
      return res.status(400).json({ success: false, message: "Cannot change Owner role" });
    }

    const members = Array.isArray(group.members) ? group.members : [];
    const updatedMembers = members.map(m => {
      if (String(m.user_id) === String(memberUserId)) {
        return { ...m, role };
      }
      return m;
    });

    const { error: updateErr } = await supabase
      .from("groups")
      .update({ members: updatedMembers })
      .eq("id", id);

    if (updateErr) throw updateErr;

    return res.json({ success: true, message: "Member role updated successfully" });
  } catch (err) {
    console.error("❌ updateMemberRole:", err);
    return res.status(500).json({ success: false, message: "Failed to update member role" });
  }
};

export const addGroupResource = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userName = req.user?.username || "Unknown";
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id: groupId } = req.params;
    const { type, resource_id, name } = req.body;

    if (!type || !resource_id || !name) {
      return res.status(400).json({ success: false, message: "type, resource_id, and name are required" });
    }

    const { data: group, error: fetchErr } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (fetchErr) throw fetchErr;

    const resources = Array.isArray(group.resources) ? group.resources : [];
    const exists = resources.some(r => String(r.type) === String(type) && String(r.resource_id) === String(resource_id));
    if (exists) {
      return res.status(400).json({ success: false, message: "Resource already shared in group" });
    }

    const newResource = {
      type,
      resource_id: String(resource_id),
      name: String(name),
      owner_id: String(userId),
      owner_name: userName,
      visibility: "public"
    };

    const nextResources = [...resources, newResource];
    const { error: updateErr } = await supabase
      .from("groups")
      .update({ resources: nextResources })
      .eq("id", groupId);

    if (updateErr) throw updateErr;

    const hydrated = await hydrateGroupResources(nextResources);
    return res.json({ success: true, message: "Resource added successfully", resources: hydrated });
  } catch (err) {
    console.error("❌ addGroupResource:", err);
    return res.status(500).json({ success: false, message: "Failed to add resource" });
  }
};

export const deleteGroupResource = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id: groupId, resourceId } = req.params;

    const { data: group, error: fetchErr } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (fetchErr) throw fetchErr;

    const resources = Array.isArray(group.resources) ? group.resources : [];
    const resource = resources.find(r => String(r.resource_id) === String(resourceId));
    if (!resource) return res.status(404).json({ success: false, message: "Resource not found" });

    const isCreator = String(group.creator_id) === String(userId);
    const isOwner = String(resource.owner_id) === String(userId);
    if (!isCreator && !isOwner) {
      return res.status(403).json({ success: false, message: "No permission to remove this resource" });
    }

    const nextResources = resources.filter(r => String(r.resource_id) !== String(resourceId));

    const { error: updateErr } = await supabase
      .from("groups")
      .update({ resources: nextResources })
      .eq("id", groupId);

    if (updateErr) throw updateErr;

    const hydrated = await hydrateGroupResources(nextResources);
    return res.json({ success: true, message: "Resource removed successfully", resources: hydrated });
  } catch (err) {
    console.error("❌ deleteGroupResource:", err);
    return res.status(500).json({ success: false, message: "Failed to remove resource" });
  }
};

export const addMission = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userName = req.user?.username || "Unknown";
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id: groupId } = req.params;
    const { title, type, description, reward, image, required_level, notes, player_notes, objectives, steps, rewards, reward_items } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "title is required" });
    }

    const { data: group, error: fetchErr } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (fetchErr) throw fetchErr;

    const missions = Array.isArray(group.missions) ? group.missions : [];
    const newMission = {
      id: generateMissionId(),
      title: title.trim(),
      type: type || "main",
      description: description || "",
      reward: reward || "",
      status: "active",
      image: image || null,
      required_level: required_level ? Number(required_level) : null,
      notes: notes || "",
      player_notes: player_notes || "",
      objectives: objectives || [],
      steps: Array.isArray(steps) ? steps : [{ title: "Step 1", description: "", objectives: [] }],
      rewards: Array.isArray(rewards) ? rewards : [],
      reward_items: Array.isArray(reward_items) ? reward_items : [],
      created_by: { id: String(userId), name: userName },
      created_at: new Date().toISOString()
    };

    const nextMissions = [...missions, newMission];
    const { error: updateErr } = await supabase
      .from("groups")
      .update({ missions: nextMissions })
      .eq("id", groupId);

    if (updateErr) throw updateErr;

    return res.json({ success: true, message: "Mission added successfully", missions: nextMissions });
  } catch (err) {
    console.error("❌ addMission:", err);
    return res.status(500).json({ success: false, message: "Failed to add mission" });
  }
};

export const updateMission = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id: groupId, missionId } = req.params;
    const { title, type, description, reward, status, objectives, image, required_level, notes, player_notes, steps, rewards, reward_items } = req.body;

    const { data: group, error: fetchErr } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (fetchErr) throw fetchErr;

    const missions = Array.isArray(group.missions) ? group.missions : [];
    const updatedMissions = missions.map(m => {
      if (m.id === missionId) {
        return {
          ...m,
          title: title !== undefined ? title.trim() : m.title,
          type: type !== undefined ? type : m.type,
          description: description !== undefined ? description : m.description,
          reward: reward !== undefined ? reward : m.reward,
          status: status !== undefined ? status : m.status,
          objectives: objectives !== undefined ? objectives : m.objectives,
          steps: steps !== undefined ? steps : m.steps,
          rewards: rewards !== undefined ? rewards : m.rewards,
          reward_items: reward_items !== undefined ? reward_items : m.reward_items,
          image: image !== undefined ? image : m.image,
          required_level: required_level !== undefined ? (required_level ? Number(required_level) : null) : m.required_level,
          notes: notes !== undefined ? notes : m.notes,
          player_notes: player_notes !== undefined ? player_notes : m.player_notes,
          updated_at: new Date().toISOString()
        };
      }
      return m;
    });

    const { error: updateErr } = await supabase
      .from("groups")
      .update({ missions: updatedMissions })
      .eq("id", groupId);

    if (updateErr) throw updateErr;

    return res.json({ success: true, message: "Mission updated successfully", missions: updatedMissions });
  } catch (err) {
    console.error("❌ updateMission:", err);
    return res.status(500).json({ success: false, message: "Failed to update mission" });
  }
};

export const deleteMission = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id: groupId, missionId } = req.params;

    const { data: group, error: fetchErr } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (fetchErr) throw fetchErr;

    const missions = Array.isArray(group.missions) ? group.missions : [];
    const nextMissions = missions.filter(m => m.id !== missionId);

    const { error: updateErr } = await supabase
      .from("groups")
      .update({ missions: nextMissions })
      .eq("id", groupId);

    if (updateErr) throw updateErr;

    return res.json({ success: true, message: "Mission deleted successfully", missions: nextMissions });
  } catch (err) {
    console.error("❌ deleteMission:", err);
    return res.status(500).json({ success: false, message: "Failed to delete mission" });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id } = req.params;
    const { name, description, color, password, roles, members, friend_invite_enabled, tarot_card, max_members, icon } = req.body;

    const { data: group, error: fetchErr } = await supabase
      .from("groups")
      .select("creator_id")
      .eq("id", id)
      .single();

    if (fetchErr) {
      if (fetchErr.code === "PGRST116") return res.status(404).json({ success: false, message: "Group not found" });
      throw fetchErr;
    }

    if (String(group.creator_id) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Only the owner can update this group" });
    }

    const payload = {};
    if (name !== undefined) payload.name = name.trim();
    if (description !== undefined) payload.description = description ? description.trim() : null;
    if (color !== undefined) payload.color = color;
    if (password !== undefined) payload.password = password && password.trim() ? password.trim() : null;
    if (roles !== undefined) payload.roles = roles;
    if (members !== undefined) payload.members = members;
    if (friend_invite_enabled !== undefined) payload.friend_invite_enabled = friend_invite_enabled;
    if (tarot_card !== undefined) payload.tarot_card = tarot_card;
    if (max_members !== undefined) payload.max_members = max_members;
    if (icon !== undefined) payload.icon = icon;

    const { data: updatedGroup, error: updateErr } = await supabase
      .from("groups")
      .update(payload)
      .eq("id", id)
      .select("id, name, description, color, icon, share_code, members, resources, missions, max_members, creator_name, creator_id, created_at, roles, friend_invite_enabled, tarot_card")
      .single();

    if (updateErr) throw updateErr;

    if (updatedGroup) {
      updatedGroup.resources = await hydrateGroupResources(updatedGroup.resources);
    }

    return res.json({ success: true, message: "Group updated successfully", data: updatedGroup });
  } catch (err) {
    console.error("❌ updateGroup:", err);
    return res.status(500).json({ success: false, message: "Failed to update group" });
  }
};

export const listTarotCards = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tarot_card")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    return res.json(data || []);
  } catch (err) {
    console.error("❌ listTarotCards:", err);
    return res.status(500).json({ success: false, message: "Failed to get tarot cards" });
  }
};

export const updateGroupResource = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id: groupId, resourceId } = req.params;
    const { visibility, hidden, tarot_ids, active, allowed_user_ids } = req.body || {};

    const wantsVisibility = visibility !== undefined;
    const wantsHidden = hidden !== undefined;
    const wantsTarot = Array.isArray(tarot_ids);
    const wantsActive = active !== undefined;
    const wantsAllowedUsers = Array.isArray(allowed_user_ids);

    if (!wantsVisibility && !wantsHidden && !wantsTarot && !wantsActive && !wantsAllowedUsers) {
      return res.status(400).json({
        success: false,
        message: "Nothing to update. Provide 'visibility', 'hidden', 'tarot_ids', 'active', or 'allowed_user_ids'."
      });
    }

    const { data: group, error: fetchErr } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (fetchErr) {
      if (fetchErr.code === "PGRST116") return res.status(404).json({ success: false, message: "Group not found" });
      throw fetchErr;
    }

    const members = Array.isArray(group.members) ? group.members : [];
    const isCreator = String(group.creator_id) === String(userId);
    const isMember = isCreator || members.some(m => String(m.user_id) === String(userId));
    if (!isMember) {
      return res.status(403).json({ success: false, message: "You are not a member of this group" });
    }

    const resources = Array.isArray(group.resources) ? group.resources : [];
    const idx = resources.findIndex(r => String(r.resource_id) === String(resourceId));
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Resource not found in this group" });
    }

    const target = resources[idx];
    const isOwner = String(target.owner_id) === String(userId);

    if (!isCreator && !isOwner) {
      return res.status(403).json({ success: false, message: "No permission to modify this resource" });
    }

    const nextResources = resources.map((r, i) => {
      if (i !== idx) return r;
      const patch = { ...r };
      if (wantsVisibility) patch.visibility = visibility;
      if (wantsHidden) patch.hidden = Boolean(hidden);
      if (wantsTarot) patch.tarot_ids = tarot_ids;
      if (wantsActive) patch.active = Boolean(active);
      if (wantsAllowedUsers) patch.allowed_user_ids = allowed_user_ids;
      return patch;
    });

    const { data: updatedGroup, error: updateErr } = await supabase
      .from("groups")
      .update({ resources: nextResources })
      .eq("id", groupId)
      .select("id, name, description, color, icon, share_code, members, resources, missions, max_members, creator_name, creator_id, created_at, roles, friend_invite_enabled, tarot_card")
      .single();

    if (updateErr) throw updateErr;

    const hydratedRes = await hydrateGroupResources(updatedGroup.resources);
    const { password, ...safe } = updatedGroup || {};

    return res.json({ success: true, message: "Resource updated successfully", data: { ...safe, resources: hydratedRes } });
  } catch (err) {
    console.error("❌ updateGroupResource:", err);
    return res.status(500).json({ success: false, message: "Failed to update resource" });
  }
};
