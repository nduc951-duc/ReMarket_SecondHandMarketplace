const { createClient } = require('@supabase/supabase-js');
const {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} = require('../config/env');

let adminClient = null;

function getAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong backend/.env.',
    );
  }

  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}

/**
 * Get user profile from the `profiles` table.
 * Falls back to creating a minimal profile from auth user_metadata if none exists.
 */
async function getProfile(userId) {
  const client = getAdminClient();

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // Profile not found – create one from auth metadata
    const { data: authUser, error: authError } = await client.auth.admin.getUserById(userId);
    if (authError) {
      throw authError;
    }

    const newProfile = {
      id: userId,
      full_name: authUser.user?.user_metadata?.full_name || '',
      phone: '',
      address: '',
      bio: '',
      avatar_url: '',
    };

    const { data: inserted, error: insertError } = await client
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();

    if (insertError) {
      // If insert fails (e.g. table doesn't exist), return data from auth
      return {
        id: userId,
        full_name: authUser.user?.user_metadata?.full_name || '',
        email: authUser.user?.email || '',
        phone: '',
        address: '',
        bio: '',
        avatar_url: '',
        created_at: authUser.user?.created_at || null,
        updated_at: null,
      };
    }

    return {
      ...inserted,
      email: authUser.user?.email || '',
    };
  }

  if (error) {
    throw error;
  }

  // Enrich with email from auth
  const { data: authUser } = await client.auth.admin.getUserById(userId);

  return {
    ...data,
    email: authUser?.user?.email || '',
  };
}

/**
 * Update user profile fields (full_name, phone, address, bio).
 */
async function updateProfile(userId, updates) {
  const client = getAdminClient();

  const allowedFields = ['full_name', 'phone', 'address', 'bio'];
  const cleanUpdates = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      cleanUpdates[field] = typeof updates[field] === 'string' ? updates[field].trim() : updates[field];
    }
  }

  cleanUpdates.updated_at = new Date().toISOString();

  // Try upsert in case profile doesn't exist yet
  const { data, error } = await client
    .from('profiles')
    .upsert({ id: userId, ...cleanUpdates }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Also update full_name in auth metadata if provided
  if (cleanUpdates.full_name) {
    await client.auth.admin.updateUserById(userId, {
      user_metadata: { full_name: cleanUpdates.full_name },
    });
  }

  const { data: authUser } = await client.auth.admin.getUserById(userId);

  return {
    ...data,
    email: authUser?.user?.email || '',
  };
}

/**
 * Upload avatar to Supabase Storage and update profile.
 * @param {string} userId
 * @param {Buffer} fileBuffer
 * @param {string} mimeType
 * @param {string} originalName
 */
async function uploadAvatar(userId, fileBuffer, mimeType, originalName) {
  const client = getAdminClient();

  const extension = originalName.split('.').pop() || 'jpg';
  const filePath = `avatars/${userId}/avatar_${Date.now()}.${extension}`;

  // Upload to storage
  const { data: uploadData, error: uploadError } = await client.storage
    .from('avatar')
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    // If bucket doesn't exist, provide helpful error
    if (String(uploadError.message || '').includes('not found')) {
      throw new Error(
        'Storage bucket "avatar" chua duoc tao. Hay tao bucket "avatar" (Public) trong Supabase Dashboard → Storage.',
      );
    }
    throw uploadError;
  }

  // Get public URL
  const { data: publicUrlData } = client.storage
    .from('avatar')
    .getPublicUrl(filePath);

  const avatarUrl = publicUrlData.publicUrl;

  // Update profile with new avatar URL
  const { data, error } = await client
    .from('profiles')
    .upsert(
      { id: userId, avatar_url: avatarUrl, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  const { data: authUser } = await client.auth.admin.getUserById(userId);

  return {
    ...data,
    email: authUser?.user?.email || '',
  };
}

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
};
