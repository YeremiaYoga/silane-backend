import supabase from "../utils/db.js";
import {
  getFriendshipBetween,
  createFriendRequest,
  updateFriendshipById,
  deleteFriendshipBetween,
  listFriendshipsForUser,
  listPendingFriendshipsForUser,
} from "../models/friendshipModel.js";

export const listFriends = async (req, res) => {
  try {
    const me = req.user?.id || req.user?.silane_id || req.user?.user_id;
    if (!me) return res.status(401).json({ success: false, error: "Unauthorized" });

    const friendships = await listFriendshipsForUser(me, "accepted");
    if (!friendships.length) {
      return res.json({ success: true, friends: [] });
    }

    const friendIds = friendships.map((f) =>
      f.user_a_id === me ? f.user_b_id : f.user_a_id
    );

    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, name, username, profile_picture, friend_code")
      .in("id", friendIds);

    if (error) {
      console.error("❌ listFriends users error:", error.message);
      return res.status(500).json({ success: false, error: "Failed to fetch friends data" });
    }

    const friends = friendships.map((f) => {
      const friendId = f.user_a_id === me ? f.user_b_id : f.user_a_id;
      const friendUser = (users || []).find((u) => u.id === friendId) || {
        id: friendId,
        name: "Friend",
        username: "friend",
        profile_picture: ""
      };
      return {
        friendship_id: f.id,
        friend: friendUser,
        created_at: f.created_at,
      };
    });

    return res.json({ success: true, friends });
  } catch (err) {
    console.error("💥 listFriends error:", err);
    return res.status(500).json({ success: false, error: "Failed to list friends" });
  }
};

export const addFriendByCode = async (req, res) => {
  try {
    const me = req.user?.id || req.user?.silane_id || req.user?.user_id;
    const { friend_code } = req.body;
    if (!me) return res.status(401).json({ success: false, error: "Unauthorized" });
    if (!friend_code) return res.status(400).json({ success: false, error: "friend_code is required" });

    const { data: myUser } = await supabase.from("users").select("friend_code").eq("id", me).maybeSingle();
    const myCode = myUser?.friend_code || "";

    const { data: target, error: targetErr } = await supabase
      .from("users")
      .select("id, friend_code")
      .eq("friend_code", friend_code.trim())
      .maybeSingle();

    if (targetErr || !target) {
      return res.status(404).json({ success: false, error: "User with this friend code not found" });
    }

    if (target.id === me) {
      return res.status(400).json({ success: false, error: "You cannot add yourself" });
    }

    const existing = await getFriendshipBetween(me, target.id);
    if (existing) {
      if (existing.status === "accepted") {
        return res.status(400).json({ success: false, error: "You are already friends" });
      }
      if (existing.status === "pending") {
        return res.status(400).json({ success: false, error: "Friend request already pending" });
      }
    }

    const friendship = await createFriendRequest({
      fromUserId: me,
      toUserId: target.id,
      fromCode: myCode,
      toCode: target.friend_code,
    });

    return res.json({ success: true, friendship });
  } catch (err) {
    console.error("💥 addFriendByCode error:", err);
    return res.status(500).json({ success: false, error: "Failed to add friend" });
  }
};

export const respondFriendRequest = async (req, res) => {
  try {
    const me = req.user?.id || req.user?.silane_id || req.user?.user_id;
    const { friendship_id, action } = req.body;
    if (!me) return res.status(401).json({ success: false, error: "Unauthorized" });
    if (!friendship_id || !action) return res.status(400).json({ success: false, error: "friendship_id and action required" });

    const { data: friendship, error } = await supabase.from("friendships").select("*").eq("id", friendship_id).maybeSingle();
    if (error || !friendship) return res.status(404).json({ success: false, error: "Friendship not found" });

    if (action === "accept") {
      const updated = await updateFriendshipById(friendship_id, { status: "accepted" });
      return res.json({ success: true, friendship: updated });
    } else {
      await supabase.from("friendships").delete().eq("id", friendship_id);
      return res.json({ success: true, message: "Friend request rejected" });
    }
  } catch (err) {
    console.error("💥 respondFriendRequest error:", err);
    return res.status(500).json({ success: false, error: "Failed to respond to friend request" });
  }
};

export const removeFriend = async (req, res) => {
  try {
    const me = req.user?.id || req.user?.silane_id || req.user?.user_id;
    const { friendId } = req.params;
    if (!me) return res.status(401).json({ success: false, error: "Unauthorized" });

    await deleteFriendshipBetween(me, friendId);
    return res.json({ success: true, message: "Friend removed" });
  } catch (err) {
    console.error("💥 removeFriend error:", err);
    return res.status(500).json({ success: false, error: "Failed to remove friend" });
  }
};

export const listFriendRequests = async (req, res) => {
  try {
    const me = req.user?.id || req.user?.silane_id || req.user?.user_id;
    if (!me) return res.status(401).json({ success: false, error: "Unauthorized" });

    const pending = await listPendingFriendshipsForUser(me);
    return res.json({ success: true, requests: pending });
  } catch (err) {
    console.error("💥 listFriendRequests error:", err);
    return res.status(500).json({ success: false, error: "Failed to list requests" });
  }
};

export const listBlockedFriends = async (req, res) => {
  try {
    return res.json({ success: true, blocked: [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to list blocked" });
  }
};

export const blockUser = async (req, res) => {
  try {
    return res.json({ success: true, message: "User blocked" });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to block user" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    return res.json({ success: true, message: "User unblocked" });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to unblock user" });
  }
};
