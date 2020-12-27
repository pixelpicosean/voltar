export function get_extname(filename: string): string {
    return filename.substring(filename.lastIndexOf('.') + 1, filename.length) || filename;
}
