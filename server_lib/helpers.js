import fs from 'fs';

export const getDestinationFolder = (origin, isDev) => {

  if (isDev) return 'public'
  
  return 'dist'
}

export const directoryExists = directoryPath => {
  try {
    // Check if the directory exists by attempting to access its stats
    const stats = fs.statSync(directoryPath);
    return stats.isDirectory();
  } catch (error) {
    // If an error occurs, the directory does not exist
    return false;
  }
}