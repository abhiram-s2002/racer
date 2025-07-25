/* eslint-env node */
/* global console */
import { supabase } from './supabaseClient';
import { ImageUrlHelper } from './imageUrlHelper';

export interface Listing {
  id?: string;
  title: string;
  description?: string;
  price: string;
  price_unit?: string;
  category: string;
  images: string[];
  thumbnail_images?: string[];
  preview_images?: string[];
  is_active: boolean;
  username: string;
  created_at?: string;
  latitude?: number;
  longitude?: number;
  expires_at?: string;
  extension_count?: number;
}

// Fetch all listings (excluding expired ones)
export async function getListings(page = 1, pageSize = 10): Promise<Listing[]> { // Reduced from 20
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString()) // Only non-expired listings
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return data as Listing[];
}

// Add a new listing
export async function addListing(listing: Listing): Promise<Listing> {
  const { data, error } = await supabase
    .from('listings')
    .insert([listing])
    .select()
    .single();
  if (error) throw error;
  return data as Listing;
}

// Add a new listing with image support (no metadata)
export async function addListingWithImages(listing: Listing): Promise<Listing> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .insert([listing])
      .select()
      .single();
    if (error) throw error;
    return data as Listing;
  } catch (error) {
    console.error('Error adding listing with images:', error);
    throw error;
  }
}

// Update a listing
export async function updateListing(id: string, updates: Partial<Listing>): Promise<Listing> {
  const { data, error } = await supabase
    .from('listings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Listing;
}

// Update a listing with image support (no metadata)
export async function updateListingWithImages(id: string, updates: Partial<Listing>): Promise<Listing> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Listing;
  } catch (error) {
    console.error('Error updating listing with images:', error);
    throw error;
  }
}

// Delete a listing
export async function deleteListing(id: string): Promise<void> {
  try {
    // First, get the listing to find associated images
    const { data: listing } = await supabase
      .from('listings')
      .select('images, thumbnail_images, preview_images')
      .eq('id', id)
      .single();

    // Delete the listing
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Clean up associated images from storage
    if (listing) {
      const allImages = [
        ...(listing.images || []),
        ...(listing.thumbnail_images || []),
        ...(listing.preview_images || [])
      ];
      const paths = allImages
        .map((url: string) => ImageUrlHelper.extractStoragePathFromUrl(url))
        .filter((p): p is string => !!p);
      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from('listings').remove(paths);
        if (storageError) {
          console.warn('Some images could not be deleted from storage:', storageError);
        } else {
          console.log('Deleted images from storage:', paths);
        }
      }
    }
  } catch (error) {
    console.error('Error deleting listing:', error);
    throw error;
  }
}

// Get listing by ID
export async function getListingById(id: string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw error;
  }
  
  return data as Listing;
}

// Get listings by username
export async function getListingsByUsername(username: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('username', username)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Listing[];
}

// Get listings by category
export async function getListingsByCategory(category: string, page = 1, pageSize = 10): Promise<Listing[]> { // Reduced from 20
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(from, to);
  
  if (error) throw error;
  return data as Listing[];
}

// Search listings (excluding expired ones)
export async function searchListings(query: string, page = 1, pageSize = 10): Promise<Listing[]> { // Reduced from 20
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString()) // Only non-expired listings
    .order('created_at', { ascending: false })
    .range(from, to);
  
  if (error) throw error;
  return data as Listing[];
}

// Extend listing expiration
export async function extendListingExpiration(listingId: string, extensionDays: number = 30): Promise<{
  success: boolean;
  newExpiresAt?: string;
  extensionCount?: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .rpc('extend_listing_expiration', {
        listing_id_param: listingId,
        extension_days: extensionDays
      });

    if (error) {
      console.error('Error extending listing expiration:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      newExpiresAt: data.new_expires_at,
      extensionCount: data.extension_count
    };
  } catch (error) {
    console.error('Error extending listing expiration:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Get listings that are expiring soon (within specified days)
export async function getExpiringListings(username: string, daysUntilExpiry: number = 7): Promise<Listing[]> {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);
  
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('username', username)
    .eq('is_active', true)
    .lte('expires_at', expiryDate.toISOString())
    .gt('expires_at', new Date().toISOString()) // Still active
    .order('expires_at', { ascending: true });
  
  if (error) throw error;
  return data as Listing[];
}

// Get expired listings for a user
export async function getExpiredListings(username: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('username', username)
    .eq('is_active', true)
    .lte('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false });
  
  if (error) throw error;
  return data as Listing[];
}

// Clean up expired listings (can be called manually or scheduled)
export async function cleanupExpiredListings(): Promise<{
  success: boolean;
  deletedCount?: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .rpc('cleanup_expired_listings');

    if (error) {
      console.error('Error cleaning up expired listings:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      deletedCount: 0 // The function doesn't return count, but we can track it
    };
  } catch (error) {
    console.error('Error cleaning up expired listings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Create listing with expiration using the database function
export async function createListingWithExpiration(listing: Listing & {
  expirationDays?: number;
}): Promise<Listing> {
  try {
    const {
      expirationDays = 30,
      ...listingData
    } = listing;

    const { data, error } = await supabase
      .rpc('create_listing_with_expiration', {
        username_param: listing.username,
        title_param: listing.title,
        description_param: listing.description || '',
        price_param: parseFloat(listing.price),
        category_param: listing.category,
        images_param: listing.images,
        thumbnail_images_param: listing.thumbnail_images || [],
        preview_images_param: listing.preview_images || [],
        latitude_param: listing.latitude || null,
        longitude_param: listing.longitude || null,
        expiration_days: expirationDays
      });

    if (error) throw error;

    // Fetch the created listing
    return await getListingById(data) as Listing;
  } catch (error) {
    console.error('Error creating listing with expiration:', error);
    throw error;
  }
} 