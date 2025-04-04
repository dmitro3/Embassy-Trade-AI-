#!/usr/bin/env python
import os
import requests
from bs4 import BeautifulSoup
import time

# Define the output directory
output_dir = os.path.join('public', 'images', 'logos')
os.makedirs(output_dir, exist_ok=True)
print(f"Saving logos to {os.path.abspath(output_dir)}")

# Function to download an image from URL
def download_image(url, filename):
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        with open(os.path.join(output_dir, filename), 'wb') as file:
            for chunk in response.iter_content(chunk_size=8192):
                file.write(chunk)
        print(f"Successfully downloaded {filename}")
        return True
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return False

# Get Twitter/X profile page
try:
    x_url = "https://x.com/EMBASSYTRADEAI"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    response = requests.get(x_url, headers=headers)
    response.raise_for_status()
    
    # Parse the HTML content with BeautifulSoup
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Find the profile picture
    # Since Twitter/X dynamically loads content, direct scraping might not work well
    # We'll attempt to find image links that might contain the profile picture
    img_tags = soup.find_all('img')
    profile_pic_found = False
    
    for img in img_tags:
        src = img.get('src', '')
        if 'profile' in src.lower() and ('photo' in src.lower() or 'avatar' in src.lower()):
            download_image(src, 'embassy_twitter_logo.png')
            profile_pic_found = True
            break
    
    if not profile_pic_found:
        print("Could not find Twitter/X profile picture through direct scraping.")
        print("Attempting to use fixed URL pattern instead...")
        
        # As a fallback, we'll try to use the embassy website to get the logo
except Exception as e:
    print(f"Error accessing Twitter/X profile: {e}")

# Get Embassy AI website
try:
    embassy_url = "https://embassyai.xyz/"
    response = requests.get(embassy_url)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Find logo images - typically these are in the header or have logo in class names
    logo_candidates = []
    img_tags = soup.find_all('img')
    
    for img in img_tags:
        src = img.get('src', '')
        alt = img.get('alt', '').lower()
        class_name = ' '.join(img.get('class', [])).lower()
        
        # Look for likely logo elements
        if ('logo' in src.lower() or 'logo' in alt or 'logo' in class_name or 
            'brand' in src.lower() or 'brand' in alt or 'brand' in class_name or
            'embassy' in alt.lower()):
            if src.startswith('http'):
                logo_url = src
            elif src.startswith('/'):
                logo_url = f"{embassy_url.rstrip('/')}{src}"
            else:
                logo_url = f"{embassy_url.rstrip('/')}/{src}"
            
            logo_candidates.append(logo_url)
    
    # Download logo candidates
    if logo_candidates:
        for i, logo_url in enumerate(logo_candidates):
            extension = logo_url.split('.')[-1] if '.' in logo_url else 'png'
            if extension.lower() not in ['jpg', 'jpeg', 'png', 'svg', 'gif']:
                extension = 'png'  # Default to PNG if extension is unusual
            
            filename = f"embassy_logo_{i+1}.{extension}"
            download_image(logo_url, filename)
    else:
        print("Could not find any logo images on the website.")

    # Also try to find any SVG logos which might be embedded directly
    svg_tags = soup.find_all('svg')
    if svg_tags:
        for i, svg in enumerate(svg_tags):
            if ('logo' in str(svg).lower() or 'embassy' in str(svg).lower()):
                svg_filename = f"embassy_svg_logo_{i+1}.svg"
                with open(os.path.join(output_dir, svg_filename), 'w') as file:
                    file.write(str(svg))
                print(f"Saved embedded SVG logo as {svg_filename}")
                
except Exception as e:
    print(f"Error accessing Embassy AI website: {e}")

print("\nLogo download process complete. Please check the logos directory and verify the downloaded files.")
print("You may need to manually download the logos if the automated approach didn't succeed.")
print("Suggested manual approach:")
print("1. Visit https://x.com/EMBASSYTRADEAI and manually save the profile picture")
print("2. Visit https://embassyai.xyz/ and use browser developer tools to inspect and download the logo")