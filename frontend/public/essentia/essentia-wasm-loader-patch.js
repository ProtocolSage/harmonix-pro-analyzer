if (!self.__essentiaWasmLoaderPatched) {
  self.__essentiaWasmLoaderPatched = true;

  // Patch for Essentia WASM loader to force loading from /essentia/ directory
  // This script modifies the scriptDirectory to always point to /essentia/

  // Store the original importScripts function
  self.originalImportScripts = self.originalImportScripts || self.importScripts;

  // Override importScripts to intercept and patch the WASM loader
  self.importScripts = function(...urls) {
    console.log('🔧 Patching importScripts for:', urls);
    
    // Check if we're loading the essentia-wasm.web.js file
    const essentiaWasmIndex = urls.findIndex(url => url.includes('essentia-wasm.web.js'));
    
    if (essentiaWasmIndex !== -1) {
      console.log('🎯 Found essentia-wasm.web.js, applying patch...');
      
      // Load the script content first
      const xhr = new XMLHttpRequest();
      xhr.open('GET', urls[essentiaWasmIndex], false); // Synchronous request
      xhr.send(null);
      
      if (xhr.status === 200) {
        let scriptContent = xhr.responseText;
        
        // Patch 1: Replace the scriptDirectory assignment in worker context
        // Look for: if(ENVIRONMENT_IS_WORKER){scriptDirectory=self.location.href}
        scriptContent = scriptContent.replace(
          /if\(ENVIRONMENT_IS_WORKER\)\{scriptDirectory=self\.location\.href\}/g,
          'if(ENVIRONMENT_IS_WORKER){scriptDirectory="/essentia/"}'
        );
        
        // Patch 2: Also patch any direct assignment to scriptDirectory from self.location.href
        scriptContent = scriptContent.replace(
          /scriptDirectory=self\.location\.href/g,
          'scriptDirectory="/essentia/"'
        );
        
        // Patch 4: If scriptDirectory is set from document.currentScript.src, override it
        scriptContent = scriptContent.replace(
          /scriptDirectory=document\.currentScript\.src/g,
          'scriptDirectory="/essentia/"'
        );
        
        // Patch 5: Handle the case where scriptDirectory is modified after being set
        scriptContent = scriptContent.replace(
          /scriptDirectory=scriptDirectory\.substr\(0,scriptDirectory\.lastIndexOf\("\/"\)\+1\)/g,
          'scriptDirectory="/essentia/"'
        );
        
        console.log('✅ Patches applied to essentia-wasm.web.js');
        
        // Execute the patched script
        try {
          // Execute the patched script in the worker's global scope using eval
          eval(scriptContent);

          // Explicitly attach EssentiaWASM to the global scope to ensure it's defined.
          if (typeof EssentiaWASM !== 'undefined') {
            self.EssentiaWASM = EssentiaWASM;
          }
          
          // Remove this URL from the list since we've already loaded it
          urls.splice(essentiaWasmIndex, 1);
        } catch (error) {
          console.error('❌ Error executing patched script:', error);
          throw error;
        }
      } else {
        console.error('❌ Failed to load essentia-wasm.web.js for patching');
      }
    }
    
    // Load any remaining scripts normally
    if (urls.length > 0) {
      self.originalImportScripts.apply(self, urls);
    }
  };

  console.log('✅ Essentia WASM loader patch installed');
}
