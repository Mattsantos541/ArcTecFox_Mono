// Supabase Storage Service for User Manuals

export class StorageService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.bucketName = 'user-manuals';
  }

  /**
   * Initialize storage bucket (call this once during app setup)
   */
  async initializeBucket() {
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await this.supabase.storage.listBuckets();
      
      if (listError) {
        // This is common - users often can't list buckets due to permissions
        // But they can still use buckets that exist
        // console.log('Cannot list buckets (normal for non-admin users). Assuming bucket exists...');
        return { success: true };
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);

      if (!bucketExists) {
        console.log(`Bucket '${this.bucketName}' not found. Attempting to create...`);
        
        // Try to create the bucket automatically
        const { data: newBucket, error: createError } = await this.supabase.storage.createBucket(this.bucketName, {
          public: false, // Private bucket - files accessible only to authenticated users
          fileSizeLimit: 50 * 1024 * 1024, // 50MB limit
          allowedMimeTypes: ['application/pdf', 'image/*', 'text/*', 'application/vnd.openxmlformats-officedocument.*']
        });
        
        if (createError) {
          // Check if bucket already exists (common error)
          if (createError.message.includes('already exists')) {
            // console.log('Bucket already exists, continuing...');
            return { success: true };
          }
          
          // Check if it's a permissions error
          if (createError.message.includes('row-level security policy') || 
              createError.message.includes('permission') ||
              createError.status === 400) {
            // This is expected for non-admin users
            // The bucket should already exist, created by an admin
            // console.log('Cannot create bucket (normal for non-admin users). Assuming it exists...');
            return { success: true };
          }
          
          // Unexpected error
          console.error('Unexpected storage error:', createError);
          // Still continue - don't block the user
          return { success: true };
        }
        
        console.log(`✅ Bucket '${this.bucketName}' created successfully!`);
      }

      return { success: true };
    } catch (error) {
      // Don't log errors that are expected
      // console.error('Error initializing storage bucket:', error);
      // Assume bucket exists and continue
      return { success: true };
    }
  }

  /**
   * Upload a user manual file
   * @param {File} file - The file to upload
   * @param {string} assetName - Name of the asset for folder organization
   * @param {string} userId - User ID for access control (kept for backwards compatibility)
   * @param {string} siteId - Site ID for site-based storage organization
   * @returns {Promise<Object>} Upload result with file path and URL
   */
  async uploadUserManual(file, assetName, userId, siteId = null) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error('File type not supported. Please upload PDF, DOC, DOCX, TXT, or image files.');
      }

      // Validate file size (30MB limit)
      if (file.size > 30 * 1024 * 1024) {
        throw new Error('File size must be less than 30MB');
      }

      // Generate unique file name
      const fileExtension = file.name.split('.').pop();
      const timestamp = Date.now();
      const sanitizedAssetName = assetName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const fileName = `${sanitizedAssetName}_${timestamp}.${fileExtension}`;
      
      // Use site-based path if siteId is provided, otherwise fall back to user-based path
      // This ensures backward compatibility while enabling site-based sharing
      const filePath = siteId ? `sites/${siteId}/${fileName}` : `${userId}/${fileName}`;

      // Upload file
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading file:', error);
        throw error;
      }

      // Get public URL (signed URL for private buckets)
      const { data: urlData } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry

      return {
        success: true,
        filePath: data.path,
        fileName: fileName,
        originalName: file.name,
        fileSize: file.size,
        fileType: file.type,
        publicUrl: urlData?.signedUrl,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error uploading user manual:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a user manual file
   * @param {string} filePath - Path to the file in storage
   * @returns {Promise<Object>} Delete result
   */
  async deleteUserManual(filePath) {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting file:', error);
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting user manual:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a signed URL for a user manual
   * @param {string} filePath - Path to the file in storage
   * @param {number} expiresIn - Expiry time in seconds (default: 1 hour)
   * @returns {Promise<Object>} Signed URL result
   */
  async getSignedUrl(filePath, expiresIn = 3600) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('Error getting signed URL:', error);
        throw error;
      }

      return {
        success: true,
        signedUrl: data.signedUrl
      };
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List user manuals for a specific user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} List of user manuals
   */
  async listUserManuals(userId) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(userId);

      if (error) {
        console.error('Error listing user manuals:', error);
        throw error;
      }

      return {
        success: true,
        files: data || []
      };
    } catch (error) {
      console.error('Error listing user manuals:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Helper function to create storage service instance
export const createStorageService = async () => {
  // Import the shared supabase client from api.js instead of creating a new one
  const { supabase } = await import("../api");
  
  const storageService = new StorageService(supabase);
  
  // Initialize bucket (silently handles permission issues)
  await storageService.initializeBucket();
  
  return storageService;
};