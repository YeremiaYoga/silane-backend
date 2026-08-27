import supabase from "../utils/db.js";

export function normalizePair(userId1, userId2) {
  if (userId1 === userId2) {
    throw new Error("User pair must be different");
  }
  return userId1 < userId2
    ? { user_a_id: userId1, user_b_id: userId2 }
    : { user_a_id: userId2, user_b_id: userId1 };
}

export async function getFriendshipBetween(userId1, userId2) {
  const { user_a_id, user_b_id } = normalizePair(userId1, userId2);
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .eq("user_a_id", user_a_id)
    .eq("user_b_id", user_b_id)
    .maybeSingle();
  if (error) {
    console.error("❌ getFriendshipBetween error:", error.message);
    throw error;
  }
  return data || null;
}

export async function createFriendRequest({
  fromUserId,
  toUserId,
  fromCode,
  toCode,
}) {
  const { user_a_id, user_b_id } = normalizePair(fromUserId, toUserId);
  const user_a_code = user_a_id === fromUserId ? fromCode : toCode;
  const user_b_code = user_b_id === toUserId ? toCode : fromCode;
  const { data, error } = await supabase
    .from("friendships")
    .insert({
      user_a_id,
      user_b_id,
      user_a_code,
      user_b_code,
      requester_id: fromUserId,
      status: "pending",
    })
    .select()
    .single();
  if (error) {
    console.error("❌ createFriendRequest error:", error.message);
    throw error;
  }
  return data;
}

export async function updateFriendshipById(id, payload) {
  const { data, error } = await supabase
    .from("friendships")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("❌ updateFriendshipById error:", error.message);
    throw error;
  }
  return data;
}

export async function deleteFriendshipBetween(userId1, userId2) {
  const { user_a_id, user_b_id } = normalizePair(userId1, userId2);
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("user_a_id", user_a_id)
    .eq("user_b_id", user_b_id);
  if (error) {
    console.error("❌ deleteFriendshipBetween error:", error.message);
    throw error;
  }
}

export async function listFriendshipsForUser(userId, status = "accepted") {
  const query = supabase
    .from("friendships")
    .select("*")
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
  if (status) query.eq("status", status);
  const { data, error } = await query;
  if (error) {
    console.error("❌ listFriendshipsForUser error:", error.message);
    throw error;
  }
  return data || [];
}

export async function listPendingFriendshipsForUser(userId) {
  return listFriendshipsForUser(userId, "pending");
}

export async function deleteFriendshipById(id) {
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("❌ deleteFriendshipById error:", error.message);
    throw error;
  }
}
