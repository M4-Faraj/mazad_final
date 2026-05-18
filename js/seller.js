(function () {
   const categoryMap = {
  fashion: 'Fashion',
  electronics: 'Electronics',
  art: 'Art',
  watch: 'Watches',
  cars: 'Cars',
  home: 'Home'
};
    const emojiMap = {
  fashion: '👜',
  electronics: '💻',
  art: '🖼️',
  watch: '⌚',
  cars: '🚗',
  home: '🏡'
};

    const sourceStorageKeys = [
      'auctions',
      'watchesAuctions',
      'electronicsAuctions',
      'fashionAuctions',
      'artAuctions',
      'carsAuctions',
      'homeAuctions'
    ];

    const form = document.getElementById('auctionForm');
    const titleInput = document.getElementById('title');
    const sellerInput = document.getElementById('seller');
    


    const categoryInput = document.getElementById('category');
   const priceInput = document.getElementById('price');
const expectedFinalPriceInput = document.getElementById('expectedFinalPrice');
const maxAcceptablePriceInput = document.getElementById('maxAcceptablePrice');
const incrementInput = document.getElementById('increment');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const descInput = document.getElementById('desc');

    const titleCount = document.getElementById('titleCount');
    const descCount = document.getElementById('descCount');

    const modeGrid = document.getElementById('modeGrid');
    const modeNote = document.getElementById('modeNote');

    const uploadZone = document.getElementById('uploadZone');
    const imageInput = document.getElementById('imageInput');
    const browseBtn = document.getElementById('browseBtn');
    const clearImagesBtn = document.getElementById('clearImagesBtn');
    const thumbGrid = document.getElementById('thumbGrid');

    const tagInput = document.getElementById('tagInput');
    const addTagBtn = document.getElementById('addTagBtn');
    const tagsWrap = document.getElementById('tagsWrap');

    const submitBtn = document.getElementById('submitBtn');
    const resetBtn = document.getElementById('resetBtn');
    const previewBtn = document.getElementById('previewBtn');
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const publishTopBtn = document.getElementById('publishTopBtn');
    const toastWrap = document.getElementById('toastWrap');

    const heroVisual = document.getElementById('heroVisual');
    const heroVisualImg = document.getElementById('heroVisualImg');
    const heroPreviewTitle = document.getElementById('heroPreviewTitle');
    const heroPreviewMeta = document.getElementById('heroPreviewMeta');
    const heroPreviewPrice = document.getElementById('heroPreviewPrice');
    const heroCategoryBadge = document.getElementById('heroCategoryBadge');
    const heroModeBadge = document.getElementById('heroModeBadge');
    const heroFeatureBadge = document.getElementById('heroFeatureBadge');

    const previewImg = document.getElementById('previewImg');
    const previewFallback = document.getElementById('previewFallback');
    const previewTitle = document.getElementById('previewTitle');
    const previewDesc = document.getElementById('previewDesc');
    const previewSeller = document.getElementById('previewSeller');
    const previewCategory = document.getElementById('previewCategory');
    const previewStartPrice = document.getElementById('previewStartPrice');
    const previewIncrement = document.getElementById('previewIncrement');
    const previewTags = document.getElementById('previewTags');
    const previewCategoryBadge = document.getElementById('previewCategoryBadge');
    const previewModeBadge = document.getElementById('previewModeBadge');
    const previewFeaturedBadge = document.getElementById('previewFeaturedBadge');

    const statStartingPrice = document.getElementById('statStartingPrice');
    const statMinimumBid = document.getElementById('statMinimumBid');
    const statImages = document.getElementById('statImages');
    const statTags = document.getElementById('statTags');
    const statDuration = document.getElementById('statDuration');
    const miniMode = document.getElementById('miniMode');
    const miniFeature = document.getElementById('miniFeature');
    const miniCompleteness = document.getElementById('miniCompleteness');

    const qualityTitleText = document.getElementById('qualityTitleText');
    const qualityTitleScore = document.getElementById('qualityTitleScore');
    const qualityDescText = document.getElementById('qualityDescText');
    const qualityDescScore = document.getElementById('qualityDescScore');
    const qualityMediaText = document.getElementById('qualityMediaText');
    const qualityMediaScore = document.getElementById('qualityMediaScore');
    const qualityReadyText = document.getElementById('qualityReadyText');
    const qualityReadyScore = document.getElementById('qualityReadyScore');
const liveConfigCard = document.getElementById('liveConfigCard');
const liveDurationInput = document.getElementById('liveDuration');
const facebookLiveUrlInput = document.getElementById('facebookLiveUrl');
const liveHostNameInput = document.getElementById('liveHostName');
let user = null;

try {
  user = JSON.parse(localStorage.getItem("mazadUser"));
} catch (e) {
  user = null;
}


    let activeMode = 'normal';
    let tags = ['Premium Listing'];
    let imageFiles = [];

    function formatPrice(value){
      return '$' + Number(value || 0).toLocaleString();
    }

    function getCategoryLabel(type){
      return categoryMap[type] || 'Auction';
    }

    function getCategoryEmoji(type){
      return emojiMap[type] || '💠';
    }

   function getFeatureLabel(){
  return 'STANDARD';
}
    function getModeLabel(){
  if(activeMode === 'live') return 'LIVE';
  return 'NORMAL';
}

function getModeNote(){
  if(activeMode === 'live'){
    return 'Live auction selected. Session details can be managed later by the admin team.';
  }
  return 'Normal auction selected. This listing will appear as a premium regular auction.';
}

 function showToast(title, text, type = 'info'){
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-title">${escapeHtml(title)}</div>
    <div class="toast-text">${escapeHtml(text)}</div>
  `;

  toastWrap.appendChild(toast);

  // Remove the message after 4 seconds
  setTimeout(() => {
    toast.remove();
  }, 4000);
}
    function escapeHtml(text){
      const div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    }

    function updateCounts(){
      titleCount.textContent = titleInput.value.length;
      descCount.textContent = descInput.value.length;
    }

    function renderTags(){
      tagsWrap.innerHTML = tags.map((tag, index) => `
        <span class="tag-chip">
          ${escapeHtml(tag)}
          <button type="button" data-index="${index}">×</button>
        </span>
      `).join('');

      previewTags.innerHTML = tags.map(tag => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join('');

      tagsWrap.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          tags.splice(Number(btn.dataset.index), 1);
          if(!tags.length) tags = [];
          renderTags();
          updatePreview();
        });
      });
    }

    function addTag(value){
      const clean = (value || '').trim();
      if(!clean) return;
      if(tags.includes(clean)){
        showToast('Tag exists', 'This tag was already added.', 'info');
        return;
      }
      if(tags.length >= 8){
        showToast('Limit reached', 'You can add up to 8 tags.', 'error');
        return;
      }
      tags.push(clean);
      tagInput.value = '';
      renderTags();
      updatePreview();
    }

    function renderThumbnails(){
      thumbGrid.innerHTML = imageFiles.map((fileObj, index) => `
        <div class="thumb-card">
          <img src="${fileObj.data}" alt="Auction image ${index + 1}">
          <button class="thumb-remove" type="button" data-index="${index}">×</button>
        </div>
      `).join('');

      thumbGrid.querySelectorAll('.thumb-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          imageFiles.splice(Number(btn.dataset.index), 1);
          renderThumbnails();
          updatePreview();
        });
      });
    }

    function readFiles(files){
      const incoming = Array.from(files || []).slice(0, Math.max(0, 6 - imageFiles.length));
      if(!incoming.length) return;

      incoming.forEach(file => {
        if(!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = e => {
          imageFiles.push({
            name: file.name,
            data: e.target.result
          });
          renderThumbnails();
          updatePreview();
        };
        reader.readAsDataURL(file);
      });
    }

    function calculateDurationText(){
      const start = startTimeInput.value ? new Date(startTimeInput.value).getTime() : null;
      const end = endTimeInput.value ? new Date(endTimeInput.value).getTime() : null;

      if(!start || !end) return 'Not set';
      if(end <= start) return 'Invalid range';

      const diff = end - start;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);

      if(days > 0){
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h`;
      }
      return `${hours}h`;
    }

    function calculateCompleteness(){
      let score = 0;
      if(titleInput.value.trim().length >= 8) score += 20;
      if(user && user.name) score += 10;
      if(Number(priceInput.value) > 0) score += 15;
      if(Number(incrementInput.value) > 0) score += 10;
      if(descInput.value.trim().length >= 80) score += 20;
      if(imageFiles.length >= 1) score += 15;
      if(tags.length >= 2) score += 5;
      if(startTimeInput.value && endTimeInput.value) score += 5;
      return Math.min(score, 100);
    }

    function setScoreBadge(el, label, status){
      el.textContent = label;
      el.classList.remove('score-good','score-warn','score-bad');
      el.classList.add(status);
    }

    function renderQuality(){
      const titleLen = titleInput.value.trim().length;
      const descLen = descInput.value.trim().length;
      const complete = calculateCompleteness();

      if(titleLen >= 20){
        qualityTitleText.textContent = 'Strong title. It clearly communicates product value.';
        setScoreBadge(qualityTitleScore, 'Strong', 'score-good');
      }else if(titleLen >= 8){
        qualityTitleText.textContent = 'Good start. Consider adding brand, model, or rarity.';
        setScoreBadge(qualityTitleScore, 'Okay', 'score-warn');
      }else{
        qualityTitleText.textContent = 'Add a descriptive title for the lot.';
        setScoreBadge(qualityTitleScore, 'Weak', 'score-bad');
      }

      if(descLen >= 180){
        qualityDescText.textContent = 'Great detail level. Buyers can understand the lot well.';
        setScoreBadge(qualityDescScore, 'Strong', 'score-good');
      }else if(descLen >= 80){
        qualityDescText.textContent = 'Good description. Add more specifics for stronger trust.';
        setScoreBadge(qualityDescScore, 'Okay', 'score-warn');
      }else{
        qualityDescText.textContent = 'Include condition, authenticity, and product details.';
        setScoreBadge(qualityDescScore, 'Weak', 'score-bad');
      }

      if(imageFiles.length >= 3){
        qualityMediaText.textContent = 'Excellent media coverage for a premium listing.';
        setScoreBadge(qualityMediaScore, 'Strong', 'score-good');
      }else if(imageFiles.length >= 1){
        qualityMediaText.textContent = 'Image added. More angles would improve the listing.';
        setScoreBadge(qualityMediaScore, 'Okay', 'score-warn');
      }else{
        qualityMediaText.textContent = 'Upload at least one high-quality image.';
        setScoreBadge(qualityMediaScore, 'Weak', 'score-bad');
      }

      if(complete >= 85){
        qualityReadyText.textContent = 'Listing is ready to publish with strong buyer appeal.';
        setScoreBadge(qualityReadyScore, 'Ready', 'score-good');
      }else if(complete >= 55){
        qualityReadyText.textContent = 'Listing is promising but can still be improved.';
        setScoreBadge(qualityReadyScore, 'Draft', 'score-warn');
      }else{
        qualityReadyText.textContent = 'Listing needs more details before publish.';
        setScoreBadge(qualityReadyScore, 'Draft', 'score-bad');
      }

      miniCompleteness.textContent = `${complete}%`;
    }

    function updatePreview(){
      const title = titleInput.value.trim() || 'Your Auction Title';
      const seller = sellerInput.value.trim() || 'Mazad Seller';
      const category = getCategoryLabel(categoryInput.value);
      const price = Number(priceInput.value) || 0;
      const increment = Number(incrementInput.value) || 0;
      const expectedFinalPrice = Number(expectedFinalPriceInput?.value) || 0;
const maxAcceptablePrice = Number(maxAcceptablePriceInput?.value) || 0;
      const desc = descInput.value.trim() || 'Write a premium description for your item. Buyers should immediately understand the value and condition of the lot.';
      const firstImage = imageFiles[0]?.data || '';

      heroPreviewTitle.textContent = title;
      heroPreviewMeta.textContent = `by ${seller} • ${category} • ${getModeLabel()} Auction`;
      heroPreviewPrice.textContent = formatPrice(price);

      previewTitle.textContent = title;
      previewDesc.textContent = desc;
      previewSeller.textContent = seller;
      previewCategory.textContent = category;
      previewStartPrice.textContent = formatPrice(price);
      previewIncrement.textContent = formatPrice(increment);

      heroCategoryBadge.textContent = category;
      previewCategoryBadge.textContent = category;

      heroModeBadge.textContent = getModeLabel();
      previewModeBadge.textContent = getModeLabel();

      heroFeatureBadge.textContent = getFeatureLabel();
      previewFeaturedBadge.textContent = getFeatureLabel();

      statStartingPrice.textContent = formatPrice(price);
      statMinimumBid.textContent = formatPrice(price + increment);
      statImages.textContent = imageFiles.length;
      statTags.textContent = tags.length;
      statDuration.textContent = calculateDurationText();
      miniMode.textContent = getModeLabel();
      miniFeature.textContent = getFeatureLabel().replace('FEATURED','FEAT').replace('STANDARD','STD').replace('LIVE LOT','LIVE');

      modeNote.textContent = getModeNote();

      if(firstImage){
        previewImg.src = firstImage;
        previewImg.style.display = 'block';
        previewFallback.style.display = 'none';

        heroVisualImg.src = firstImage;
        heroVisualImg.style.display = 'block';
      }else{
        previewImg.style.display = 'none';
        previewFallback.style.display = 'flex';
        previewFallback.textContent = getCategoryEmoji(categoryInput.value);

        heroVisualImg.style.display = 'none';
      }

      renderQuality();
    }
function activateMode(mode){
  activeMode = mode === 'live' ? 'live' : 'normal';
  document.querySelectorAll('.toggle-card').forEach(card => {
    card.classList.toggle('active', card.dataset.mode === mode);
  });

  if (liveConfigCard) {
    liveConfigCard.style.display = 'none';
  }

  updatePreview();
}

    function validateForm(){
      let ok = true;
     [
  titleInput,
  priceInput,
  expectedFinalPriceInput,
  maxAcceptablePriceInput,
  incrementInput,
  startTimeInput,
  endTimeInput,
  descInput
].forEach(el => {
  if (el) el.classList.remove('error');
});

      if(titleInput.value.trim().length < 6){
        titleInput.classList.add('error');
        ok = false;
      }
if(!sellerInput.value.trim()){
  sellerInput.classList.add('error');
  ok = false;
}
     

      if(Number(priceInput.value) <= 0){
        priceInput.classList.add('error');
        ok = false;
      }
      if (expectedFinalPriceInput && Number(expectedFinalPriceInput.value) > 0) {
  if (Number(expectedFinalPriceInput.value) < Number(priceInput.value)) {
    expectedFinalPriceInput.classList.add('error');
    ok = false;
  }
}

if (maxAcceptablePriceInput && Number(maxAcceptablePriceInput.value) > 0) {
  const expectedValue = Number(expectedFinalPriceInput?.value) || 0;
  const startValue = Number(priceInput.value) || 0;

  if (Number(maxAcceptablePriceInput.value) < Math.max(expectedValue, startValue)) {
    maxAcceptablePriceInput.classList.add('error');
    ok = false;
  }
}

      if(Number(incrementInput.value) <= 0){
        incrementInput.classList.add('error');
        ok = false;
      }

      if(!startTimeInput.value){
        startTimeInput.classList.add('error');
        ok = false;
      }

      if(!endTimeInput.value){
        endTimeInput.classList.add('error');
        ok = false;
      }

      if(startTimeInput.value && endTimeInput.value){
        const start = new Date(startTimeInput.value).getTime();
        const end = new Date(endTimeInput.value).getTime();
        if(end <= start){
          startTimeInput.classList.add('error');
          endTimeInput.classList.add('error');
          ok = false;
        }
      }

      if(descInput.value.trim().length <10){
        descInput.classList.add('error');
        ok = false;
      }

      if(!ok){
        showToast('Missing details', 'Please complete the highlighted fields before publishing.', 'error');
      }

      return ok;
    }

   function buildAuctionObject(){
  const price = Number(priceInput.value) || 0;
  const increment = Number(incrementInput.value) || 0;
  const expectedFinalPrice = Number(expectedFinalPriceInput?.value) || 0;
  const maxAcceptablePrice = Number(maxAcceptablePriceInput?.value) || 0;

  return {
    id: Date.now(),
    title: titleInput.value.trim(),
    seller: sellerInput.value.trim(),
    type: categoryInput.value,
    subType: categoryInput.value,
  mode: activeMode === 'live' ? 'live' : 'normal',
featured: false,
    price: price,
    startingPrice: price,

    bidIncrement: increment,
    expectedFinalPrice: expectedFinalPrice,
maxAcceptablePrice: maxAcceptablePrice,
    description: descInput.value.trim(),
    imageUrl: imageFiles[0]?.data || '',
    gallery: imageFiles.map(img => img.data),
    tags: [...tags],
    startTime: startTimeInput.value,
    endTime: endTimeInput.value,
    endsAt: new Date(endTimeInput.value).getTime(),
    createdAt: Date.now(),
    g: 'g1',

    durationMinutes: null,
    facebookLiveUrl: '',
    hostName: ''
  };
}


    function saveDraft(){
      const draft = buildAuctionObject();
      localStorage.setItem('auctionDraftMazad', JSON.stringify(draft));
      showToast('Draft saved', 'Your auction draft was saved locally.', 'success');
    }

    function loadDraft(){
      try{
        const draft = JSON.parse(localStorage.getItem('auctionDraftMazad') || 'null');
        if(!draft) return;

        titleInput.value = draft.title || '';
        sellerInput.value = draft.seller || '';
        categoryInput.value = draft.type || 'watch';
        priceInput.value = draft.startingPrice || draft.price || '';
        incrementInput.value = draft.bidIncrement || '';
        startTimeInput.value = draft.startTime || '';
        endTimeInput.value = draft.endTime || '';
        descInput.value = draft.description || '';

        activeMode = draft.mode === 'live' ? 'live' : 'normal';
        tags = Array.isArray(draft.tags) && draft.tags.length ? draft.tags : ['Premium Listing'];

        imageFiles = [];
        if(Array.isArray(draft.gallery) && draft.gallery.length){
          imageFiles = draft.gallery.slice(0,6).map((data, idx) => ({
            name: `draft-image-${idx + 1}`,
            data
          }));
        }else if(draft.imageUrl){
          imageFiles = [{ name:'draft-image', data:draft.imageUrl }];
        }

        renderTags();
        renderThumbnails();
        activateMode(activeMode);
        updateCounts();
        updatePreview();
      }catch(e){}
    }

    function resetForm(){
      form.reset();
      activeMode = 'normal';
      tags = ['Premium Listing'];
      imageFiles = [];
      renderTags();
      renderThumbnails();
      activateMode(activeMode);
      updateCounts();
      updatePreview();
    }

    function setDefaultTimes(){
      const now = new Date();
      const start = new Date(now.getTime() + 60 * 60 * 1000);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

      startTimeInput.value = toLocalDateTime(start);
      endTimeInput.value = toLocalDateTime(end);
    }

    function toLocalDateTime(date){
      const pad = n => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    function attachEvents(){
      [
  titleInput,
  categoryInput,
  priceInput,
  expectedFinalPriceInput,
  maxAcceptablePriceInput,
  incrementInput,
  startTimeInput,
  endTimeInput,
  descInput
].forEach(el => {
        el.addEventListener('input', () => {
          updateCounts();
          updatePreview();
        });
        el.addEventListener('change', updatePreview);
      });

      modeGrid.addEventListener('click', e => {
        const card = e.target.closest('.toggle-card');
        if(!card) return;
        activateMode(card.dataset.mode);
      });

      browseBtn.addEventListener('click', () => imageInput.click());
      uploadZone.addEventListener('click', (e) => {
        if(e.target.closest('button')) return;
        imageInput.click();
      });

      imageInput.addEventListener('change', e => {
        readFiles(e.target.files);
        imageInput.value = '';
      });

      ['dragenter','dragover'].forEach(evt => {
        uploadZone.addEventListener(evt, e => {
          e.preventDefault();
          uploadZone.classList.add('dragover');
        });
      });

      ['dragleave','drop'].forEach(evt => {
        uploadZone.addEventListener(evt, e => {
          e.preventDefault();
          uploadZone.classList.remove('dragover');
        });
      });

      uploadZone.addEventListener('drop', e => {
        readFiles(e.dataTransfer.files);
      });

      clearImagesBtn.addEventListener('click', () => {
        imageFiles = [];
        renderThumbnails();
        updatePreview();
      });

      addTagBtn.addEventListener('click', () => addTag(tagInput.value));
      tagInput.addEventListener('keydown', e => {
        if(e.key === 'Enter'){
          e.preventDefault();
          addTag(tagInput.value);
        }
      });

      previewBtn.addEventListener('click', () => {
        updatePreview();
        showToast('Preview updated', 'The live preview was refreshed.', 'success');
      });

      resetBtn.addEventListener('click', () => {
        resetForm();
        showToast('Form reset', 'All fields were restored to default values.', 'info');
      });

      if (saveDraftBtn) {
  saveDraftBtn.addEventListener('click', saveDraft);
}

if (publishTopBtn) {
  publishTopBtn.addEventListener('click', () => form.requestSubmit());
}
  form.addEventListener('submit', e => {
  e.preventDefault();

  if (!validateForm()) return;

  if (!user || !user.id) {
    showToast('Not logged in', 'Log in first, then try again.', 'error');
    console.error('Invalid user in localStorage:', user);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Publishing...';

  const auction = buildAuctionObject();

  // build FormData to include image files
  const formData = new FormData();
  formData.append('seller', auction.seller);
  formData.append('title', auction.title);
  formData.append('description', auction.description);
  formData.append('category', auction.type);
 formData.append('start_price', auction.price);
formData.append('current_price', auction.price);
formData.append('auction_type', auction.mode);
formData.append('end_time', auction.endTime || '');

formData.append('expected_final_price', auction.expectedFinalPrice || '');
formData.append('max_acceptable_price', auction.maxAcceptablePrice || '');
  //formData.append('user_id', user.id);

  // convert dataURL entries in imageFiles to blobs and append as images[]
  imageFiles.forEach((f, idx) => {
    try {
      const arr = f.data.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while(n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      formData.append('images[]', blob, f.name || `image_${idx}.jpg`);
    } catch (err) {
      // skip malformed images
      console.error('Image append error', err);
    }
  });

 fetch("/mazad/api/add-auction.php", {
    method: "POST",
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publish Auction';

    if (data.status === "success") {
      localStorage.removeItem('auctionDraftMazad');
      showToast("Auction added 🔥", "Waiting for admin approval", "success");

      setTimeout(() => {
        location.reload();
      }, 1000);
    } else {
      showToast("Failed to add auction ❌", data.message || "Try again", "error");
    }
  })
  .catch(err => {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publish Auction';
    console.error("Fetch error:", err);
    showToast("Server error ❌", "Check the API and database", "error");
  });
});
    }

    function init(){
      if (user && user.name) {
  sellerInput.value = user.name;
} else {
  sellerInput.value = "Mazad Seller";
}
      setDefaultTimes();
      renderTags();
      renderThumbnails();
      activateMode(activeMode);
      updateCounts();
      updatePreview();
      loadDraft();
      attachEvents();
    }

    init();

})();
