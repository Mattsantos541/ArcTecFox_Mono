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
        console.error('Error listing buckets:', listError);
        // Don't throw error - bucket might exist but we can't list it
        console.log('Assuming bucket exists and continuing...');
        return { success: true };
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);

      if (!bucketExists) {
        console.log(`Bucket '${this.bucketName}' not found. Please create it manually in Supabase dashboard.`);
        console.log('Instructions:');
        console.log('1. Go to Supabase Dashboard → Storage');
        console.log('2. Create bucket named "user-manuals"');
        console.log('3. Set as Private bucket');
        console.log('4. Set file size limit to 30MB');
        console.log('5. Add storage policies for user access');
        
        return { 
          success: false, 
          error: 'Bucket does not exist. Please create it manually in Supabase dashboard.' 
        };
      }

      console.log('Storage bucket exists and is ready to use');
      return { success: true };
    } catch (error) {
      console.error('Error initializing storage bucket:', error);
      // Don't fail completely - assume bucket exists
      console.log('Assuming bucket exists and continuing...');
      return { success: true };
    }
  }

  /**
   * Upload a user manual file
   * @param {File} file - The file to upload
   * @param {string} assetName - Name of the asset for folder organization
   * @param {string} userId - User ID for access control
   * @returns {Promise<Object>} Upload result with file path and URL
   */
  async uploadUserManual(file, assetName, userId) {
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
      const filePath = `${userId}/${fileName}`;

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
  
  // Check bucket status but don't fail if it doesn't exist
  const initResult = await storageService.initializeBucket();
  if (!initResult.success) {
    console.warn('Storage bucket check failed:', initResult.error);
    console.warn('Continuing anyway - bucket may need to be created manually');
  }
  
  return storageService;
};