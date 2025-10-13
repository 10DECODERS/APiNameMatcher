import React, { useState, useEffect } from 'react';
import { 
  Button, 
  CircularProgress, 
  Container, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Typography,
  Box,
  Tabs,
  Tab,
  Chip
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import * as XLSX from 'xlsx';
import apiService from './services/apiService';
import { Download, Settings } from '@mui/icons-material';
import { TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, Divider, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Checkbox, FormGroup, Card, CardContent, Radio, RadioGroup } from '@mui/material';
import axios from 'axios';

// Default configuration
const DEFAULT_CONFIG = {
  // API 1 Configuration - Full URL including the endpoint
  api1: {
    url: 'https://uat-ruleengine-screeningcf.digitalmta.com/namecheck/rule-matching/v2',
    keycloak: {
      url: 'https://keycloak-auth.inside10d.com',
      realm: 'ScreeningApp',
      clientId: 'screening-client',
      username: 'superuser',
      password: 'superuser'
    }
  },
  // API 2 Configuration - Base URL only, endpoint will be appended
  api2: {
    url: 'https://uat-ruleengine-screeningcf.digitalmta.com',
    keycloak: {
      url: 'https://keycloak-auth.inside10d.com',
      realm: 'ScreeningApp',
      clientId: 'screening-client',
      username: 'superuser',
      password: 'superuser'
    }
  },
  // Corporate API Configuration - Corporate screening endpoint
  api3: {
    url: 'https://screeningdevv2.ap.loclx.io/namecheck/rule-matching/v2',
    keycloak: {
      url: 'https://keycloak-auth.inside10d.com',
      realm: 'ScreeningApp',
      clientId: 'screening-client',
      username: 'superuser',
      password: 'superuser'
    }
  },
  // Processing Configuration
  processing: {
    thinkTimeMs: 1000 // Default think time of 1 second between name processing
  }
};

function App() {
  // State declarations - all hooks must be called unconditionally at the top level
  const [file, setFile] = useState(null);
  const [results, setResults] = useState([]);
  const [onlyInResults, setOnlyInResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('combined');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG); // Initialize with defaults
  const [initializing, setInitializing] = useState(true);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [selectedApis, setSelectedApis] = useState(['api1', 'api2', 'api3']); // Default: all APIs selected
  const [processingMode, setProcessingMode] = useState('all'); // 'all', 'selected', or 'individual'
  
  // Handle processing mode changes
  const handleProcessingModeChange = (newMode) => {
    setProcessingMode(newMode);
    
    // Reset API selection based on mode
    if (newMode === 'individual') {
      // In individual mode, select only the first API
      setSelectedApis(['api1']);
    } else if (newMode === 'selected') {
      // In selected mode, keep current selection or default to all
      if (selectedApis.length === 0) {
        setSelectedApis(['api1', 'api2', 'api3']);
      }
    } else if (newMode === 'all') {
      // In all mode, selection doesn't matter but keep all for consistency
      setSelectedApis(['api1', 'api2', 'api3']);
    }
  };
  
  // Initialize config from localStorage or use defaults
  useEffect(() => {
    // Only run this effect once on component mount
    if (configLoaded) return;
    
    const loadConfig = () => {
      try {
        const savedConfig = localStorage.getItem('appConfig');
        let initialConfig = DEFAULT_CONFIG;
        
        // Only try to parse saved config if it exists
        if (savedConfig) {
          try {
            const parsedConfig = JSON.parse(savedConfig);
            // Only use the saved config if it has the expected structure
            if (parsedConfig?.api1 && parsedConfig?.api2) {
              initialConfig = parsedConfig;
            }
          } catch (e) {
            console.warn('Invalid saved config, using defaults', e);
          }
        }
        
        // Ensure all required fields are present with proper defaults
        const completeConfig = {
          api1: { ...DEFAULT_CONFIG.api1, ...(initialConfig?.api1 || {}) },
          api2: { ...DEFAULT_CONFIG.api2, ...(initialConfig?.api2 || {}) },
          api3: { ...DEFAULT_CONFIG.api3, ...(initialConfig?.api3 || {}) },
          processing: { ...DEFAULT_CONFIG.processing, ...(initialConfig?.processing || {}) }
        };
        
        // Update the config state
        setConfig(completeConfig);
        console.log('Config loaded successfully:', completeConfig);
      } catch (error) {
        console.error('Error loading config:', error);
        // Already initialized with defaults
      } finally {
        setConfigLoaded(true);
      }
    };
    
    loadConfig();
  }, [configLoaded]); // Only depend on configLoaded

  // Save config to localStorage and update API service when config changes
  useEffect(() => {
    if (!configLoaded || !config) return; // Skip if config hasn't been loaded yet
    
    const updateApiConfig = async () => {
      try {
        // Save to localStorage
        localStorage.setItem('appConfig', JSON.stringify(config));
        
        // Update API service with new config for all APIs
        await apiService.updateConfig({
          api1: {
            url: config.api1?.url || DEFAULT_CONFIG.api1.url,
            keycloak: {
              url: config.api1?.keycloak?.url || DEFAULT_CONFIG.api1.keycloak.url,
              realm: config.api1?.keycloak?.realm || DEFAULT_CONFIG.api1.keycloak.realm,
              clientId: config.api1?.keycloak?.clientId || DEFAULT_CONFIG.api1.keycloak.clientId,
              username: config.api1?.keycloak?.username || DEFAULT_CONFIG.api1.keycloak.username,
              password: config.api1?.keycloak?.password || DEFAULT_CONFIG.api1.keycloak.password
            }
          },
          api2: {
            url: config.api2?.url || DEFAULT_CONFIG.api2.url,
            keycloak: {
              url: config.api2?.keycloak?.url || DEFAULT_CONFIG.api2.keycloak.url,
              realm: config.api2?.keycloak?.realm || DEFAULT_CONFIG.api2.keycloak.realm,
              clientId: config.api2?.keycloak?.clientId || DEFAULT_CONFIG.api2.keycloak.clientId,
              username: config.api2?.keycloak?.username || DEFAULT_CONFIG.api2.keycloak.username,
              password: config.api2?.keycloak?.password || DEFAULT_CONFIG.api2.keycloak.password
            }
          },
          api3: {
            url: config.api3?.url || DEFAULT_CONFIG.api3.url,
            keycloak: {
              url: config.api3?.keycloak?.url || DEFAULT_CONFIG.api3.keycloak.url,
              realm: config.api3?.keycloak?.realm || DEFAULT_CONFIG.api3.keycloak.realm,
              clientId: config.api3?.keycloak?.clientId || DEFAULT_CONFIG.api3.keycloak.clientId,
              username: config.api3?.keycloak?.username || DEFAULT_CONFIG.api3.keycloak.username,
              password: config.api3?.keycloak?.password || DEFAULT_CONFIG.api3.keycloak.password
            }
          }
        });
        
        // Set initializing to false once config is loaded and applied
        if (initializing) {
          setInitializing(false);
        }
      } catch (error) {
        console.error('Error updating config:', error);
        showSnackbar('Failed to update configuration', 'error');
        
        // If we're initializing and there's an error, use default config
        if (initializing) {
          setConfig(DEFAULT_CONFIG);
        }
      }
    };
    
    updateApiConfig();
  }, [config, initializing, configLoaded]);

  // Initialize authentication for all APIs once config is loaded
  useEffect(() => {
    if (!configLoaded || !initializing) return;
    
    const initializeAuth = async () => {
      const authResults = {
        api1: { success: false, error: null },
        api2: { success: false, error: null },
        api3: { success: false, error: null }
      };
      
      // Function to initialize a single API's authentication
      const initApiAuth = async (apiName) => {
        try {
          console.log(`Initializing authentication for ${apiName}...`);
          
          // Ensure we have valid config before proceeding
          if (!config?.[apiName]?.keycloak?.url) {
            throw new Error(`${apiName} configuration is not properly initialized`);
          }
          
          const token = await apiService.getAccessToken(apiName);
          console.log(`Successfully obtained access token for ${apiName}`);
          authResults[apiName] = { success: true };
          return true;
        } catch (error) {
          console.error(`${apiName} Initialization error:`, error);
          let errorMessage = error.message || `Failed to initialize authentication for ${apiName}`;
          
          // Extract more detailed error message if available
          if (error.response?.data?.error_description) {
            errorMessage = error.response.data.error_description;
          } else if (error.details?.message) {
            errorMessage = error.details.message;
          }
          
          authResults[apiName] = { success: false, error: errorMessage };
          return false;
        }
      };
      
      try {
        // Initialize all APIs in parallel
        await Promise.all([
          initApiAuth('api1'),
          initApiAuth('api2'),
          initApiAuth('api3')
        ]);
        
        // Check if any authentication failed
        const allSucceeded = authResults.api1.success && authResults.api2.success && authResults.api3.success;
        const anySucceeded = authResults.api1.success || authResults.api2.success || authResults.api3.success;
        
        if (!allSucceeded) {
          // Build error message for failed authentications
          const errorMessages = [];
          if (!authResults.api1.success) {
            errorMessages.push(`API1: ${authResults.api1.error}`);
          }
          if (!authResults.api2.success) {
            errorMessages.push(`API2: ${authResults.api2.error}`);
          }
          if (!authResults.api3.success) {
            errorMessages.push(`API3: ${authResults.api3.error}`);
          }
          
          setSnackbar({
            open: true,
            message: `Authentication issues: ${errorMessages.join('; ')}`,
            severity: 'warning',
            autoHideDuration: 15000 // Show for 15 seconds
          });
          
          // Only open settings if no APIs could authenticate
          if (!anySucceeded) {
            setSettingsOpen(true);
          }
        }
        
        console.log('Authentication initialization complete:', authResults);
        
      } catch (error) {
        console.error('Error during authentication initialization:', error);
        setSnackbar({
          open: true,
          message: `Error during authentication: ${error.message}`,
          severity: 'error',
          autoHideDuration: 10000
        });
        setSettingsOpen(true);
      } finally {
        setInitializing(false);
      }
    };

    initializeAuth();
  }, [configLoaded, initializing, config]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleProcessFile = async () => {
    if (!file) {
      showSnackbar('Please select a file first', 'warning');
      return;
    }
    
    if (initializing) {
      showSnackbar('Initializing authentication, please wait...', 'info');
      return;
    }
    
    if (processingMode !== 'all' && selectedApis.length === 0) {
      showSnackbar('Please select at least one API to proceed', 'warning');
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const data = await readExcel(file);
      
      // Detect file format and show notification
      const headers = data[0] || [];
      const isCorporateFormat = headers.some(header => 
        header && (header.toLowerCase().includes('entity') || header.toLowerCase().includes('person-'))
      );
      
      if (isCorporateFormat) {
        showSnackbar('Corporate format detected - extracting names from all columns', 'info', 3000);
      } else {
        showSnackbar('Standard format detected - extracting names from first column', 'info', 3000);
      }
      
      const names = extractNames(data);
      
      if (names.length === 0) {
        showSnackbar('No names found in the uploaded file', 'warning');
        setLoading(false);
        return;
      }
      
      console.log(`Extracted ${names.length} ${isCorporateFormat ? 'corporate entities' : 'names'} from ${isCorporateFormat ? 'Corporate' : 'Standard'} format`);
      
      // Process each item sequentially
      for (let i = 0; i < names.length; i++) {
        const item = names[i];
        const nameStartTime = performance.now();
        
        // Handle different data structures - define outside try block for catch access
        const displayName = item.isCorporate ? `${item.entity} (${item.persons.length} persons)` : item.name;
        
        try {
          console.log(`=== Processing ${i+1}/${names.length}: ${displayName} ===`);
          console.log(`Processing mode: ${processingMode}, Selected APIs: ${selectedApis.join(', ')}`);
          
          // Process with APIs based on selected mode
          let result;
          if (processingMode === 'all') {
            result = await apiService.processNameWithAllApis(item);
          } else if (processingMode === 'selected') {
            result = await apiService.processNameWithSelectedApis(item, selectedApis);
          } else {
            // Individual mode - process only the first selected API
            const apiToUse = selectedApis[0] || 'api1';
            result = await apiService.processNameWithSingleApi(item, apiToUse);
          }
          
          // Compare SDN data between V2, V4, API3, and Univius
          const sdnComparison = compareSdnData(
            result.api1?.responses, 
            result.api2?.responses, 
            result.api3?.responses,
            result.univius
          );
          
          const nameEndTime = performance.now();
          const nameDuration = nameEndTime - nameStartTime;
          
          console.log(`Completed processing: ${displayName} in ${nameDuration.toFixed(2)}ms`);
          
          // Update results with the new data
          const newResult = {
            name: displayName,
            v2: result.api1,  // API1 results as V2
            v4: result.api2,  // API2 results as V4
            corporate: result.api3, // Corporate API results
            univius: result.univius,
            _timing: {
              ...result._timing,
              nameProcessingStart: nameStartTime,
              nameProcessingEnd: nameEndTime,
              nameProcessingDuration: nameDuration
            },
            _sdnComparison: sdnComparison,
            _originalData: item, // Store original data for table display
            id: `${displayName}-${Date.now()}-${i}`,
            _apiResults: result // Store full API results for debugging
          };
          
          setResults(prevResults => [...prevResults, newResult]);
          
          // Update progress
          const progress = Math.round(((i + 1) / names.length) * 100);
          const getApiDisplayName = (apiName) => {
            switch(apiName) {
              case 'api1': return 'API1 (V2)';
              case 'api2': return 'API2 (V4)';
              case 'api3': return 'Corporate API';
              default: return apiName?.toUpperCase() || 'API';
            }
          };
          
          const modeText = processingMode === 'all' ? 'All APIs' : 
                          processingMode === 'selected' ? `${selectedApis.length} APIs` : 
                          getApiDisplayName(selectedApis[0]);
          showSnackbar(`Processing with ${modeText}... ${progress}% (${i+1}/${names.length} names)`, 'info', 1000);
          
          // Apply think time delay if configured (skip for last item)
          if (i < names.length - 1 && config.processing?.thinkTimeMs > 0) {
            const thinkTime = config.processing.thinkTimeMs;
            console.log(`Applying think time: ${thinkTime}ms before next name`);
            showSnackbar(`Think time: waiting ${thinkTime}ms before next name...`, 'info', thinkTime);
            await new Promise(resolve => setTimeout(resolve, thinkTime));
          } else {
            // Small delay to allow UI to update
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
        } catch (error) {
          console.error(`Error processing: ${displayName}`, error);
          // Add a failed entry to results
          setResults(prevResults => [
            ...prevResults,
            {
              name: displayName,
              error: `Error: ${error.message}`,
              _timing: {
                nameProcessingStart: nameStartTime,
                nameProcessingEnd: performance.now(),
                nameProcessingDuration: performance.now() - nameStartTime,
                error: true
              },
              id: `${displayName}-error-${Date.now()}-${i}`
            }
          ]);
        }
      }
      
      showSnackbar('All names processed!', 'success');
    } catch (error) {
      console.error('Error processing file:', error);
      showSnackbar('Failed to process file. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const readExcel = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const extractNames = (data) => {
    if (!data || data.length === 0) return [];
    
    // Check if this is Corporate API format by looking at headers
    const headers = data[0] || [];
    const isCorporateFormat = headers.some(header => 
      header && (header.toLowerCase().includes('entity') || header.toLowerCase().includes('person-'))
    );
    
    if (isCorporateFormat) {
      // Corporate API format: Return structured data with entities and persons
      const corporateData = [];
      
      // Find column indices
      const entityIndex = headers.findIndex(h => h && h.toLowerCase().includes('entity'));
      const personIndices = [];
      
      headers.forEach((header, index) => {
        if (header && header.toLowerCase().includes('person-')) {
          personIndices.push(index);
        }
      });
      
      // Skip header row and process each row
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row) continue;
        
        const entity = row[entityIndex];
        if (!entity || !entity.trim()) continue;
        
        // Extract persons from this row
        const persons = [];
        personIndices.forEach(personIndex => {
          const person = row[personIndex];
          if (person && typeof person === 'string' && person.trim()) {
            persons.push(person.trim());
          }
        });
        
        if (persons.length > 0) {
          corporateData.push({
            entity: entity.trim(),
            persons: persons,
            isCorporate: true,
            originalRow: row // Store the original row data for table display
          });
        }
      }
      
      return corporateData;
    } else {
      // Standard format: Extract from first column only
      return data.slice(1).map(row => row[0]).filter(Boolean).map(name => ({
        name: name,
        isCorporate: false
      }));
    }
  };

  // Helper function to extract SDNs from univius API response
  const extractUniviusSdns = (univiusData) => {
    if (!univiusData || !Array.isArray(univiusData)) return [];
    
    return univiusData.map(item => ({
      id: item.sdnId || 'N/A',
      name: item.sdnName || 'N/A',
      reference: item.listName || ''
    }));
  };

  // Helper function to compare SDN data between V2, V4, API3, and Univius
  const compareSdnData = (v2Data, v4Data, api3Data, univiusData) => {
    // Extract unique SDN IDs from V2, V4, API3, and Univius
    const v2Sdns = new Set(
      (v2Data?.responses || [])
        .flatMap(item => item.rulesDetails?.sdnid || [])
        .filter(Boolean)
    );
    
    const v4Sdns = new Set(
      (v4Data?.responses || [])
        .flatMap(item => item.rulesDetails?.sdnid || [])
        .filter(Boolean)
    );
    
    const api3Sdns = new Set(
      (api3Data?.responses || [])
        .flatMap(item => item.rulesDetails?.sdnid || [])
        .filter(Boolean)
    );
    
    const univiusSdns = new Set(
      (Array.isArray(univiusData) ? univiusData : [])
        .map(item => item.sdnId)
        .filter(Boolean)
    );

    // Helper function to find SDN info in V2/V4 responses
    const findSdnInfo = (data, sdnId) => {
      return (data?.responses || [])
        .flatMap(item => item.rulesDetails || [])
        .find(rule => rule.sdnid === sdnId);
    };

    // Find SDNs in V2 but not in V4, API3, or Univius
    const onlyInV2 = [];
    v2Sdns.forEach(sdnId => {
      if (!v4Sdns.has(sdnId) && !api3Sdns.has(sdnId) && !univiusSdns.has(sdnId)) {
        const sdnInfo = findSdnInfo(v2Data, sdnId);
        if (sdnInfo) {
          onlyInV2.push({
            id: sdnId,
            name: sdnInfo.sdnname || 'N/A',
            reference: sdnInfo.sanctionReferenceName || ''
          });
        }
      }
    });

    // Find SDNs in V4 but not in V2, API3, or Univius
    const onlyInV4 = [];
    v4Sdns.forEach(sdnId => {
      if (!v2Sdns.has(sdnId) && !api3Sdns.has(sdnId) && !univiusSdns.has(sdnId)) {
        const sdnInfo = findSdnInfo(v4Data, sdnId);
        if (sdnInfo) {
          onlyInV4.push({
            id: sdnId,
            name: sdnInfo.sdnname || 'N/A',
            reference: sdnInfo.sanctionReferenceName || ''
          });
        }
      }
    });
    
    // Find SDNs in API3 but not in V2, V4, or Univius
    const onlyInApi3 = [];
    api3Sdns.forEach(sdnId => {
      if (!v2Sdns.has(sdnId) && !v4Sdns.has(sdnId) && !univiusSdns.has(sdnId)) {
        const sdnInfo = findSdnInfo(api3Data, sdnId);
        if (sdnInfo) {
          onlyInApi3.push({
            id: sdnId,
            name: sdnInfo.sdnname || 'N/A',
            reference: sdnInfo.sanctionReferenceName || ''
          });
        }
      }
    });
    
    // Find SDNs in Univius but not in V2, V4, or API3
    const onlyInUnivius = [];
    univiusSdns.forEach(sdnId => {
      if (!v2Sdns.has(sdnId) && !v4Sdns.has(sdnId) && !api3Sdns.has(sdnId)) {
        const sdnInfo = (Array.isArray(univiusData) ? univiusData : []).find(item => item.sdnId === sdnId);
        if (sdnInfo) {
          onlyInUnivius.push({
            id: sdnId,
            name: sdnInfo.sdnName || 'N/A',
            reference: sdnInfo.listName || ''
          });
        }
      }
    });

    return { onlyInV2, onlyInV4, onlyInApi3, onlyInUnivius };
  };

  // Helper function to split SDN list into chunks that fit within Excel's cell limit
  const splitSdnsForExport = (sdns) => {
    if (sdns.length === 0) return [{ content: 'No matches', isContinuation: false }];
    
    const MAX_CHUNK_SIZE = 30000; // Leave some buffer under 32,767 limit
    const result = [];
    let currentChunk = [];
    let currentLength = 0;
    
    for (const sdn of sdns) {
      // Use Excel-compatible line break (\r\n) and ensure each SDN is on its own line
      const sdnText = `${sdn.id} - ${sdn.name}\r\n`;
      
      if (currentLength + sdnText.length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
        result.push({
          content: currentChunk.join('').trim(),
          isContinuation: result.length > 0
        });
        currentChunk = [];
        currentLength = 0;
      }
      
      currentChunk.push(sdnText);
      currentLength += sdnText.length;
    }
    
    // Add the last chunk if not empty
    if (currentChunk.length > 0) {
      result.push({
        content: currentChunk.join('').trim(),
        isContinuation: result.length > 0
      });
    }
    
    return result;
  };

  const exportOnlyInToExcel = async () => {
    if (onlyInResults.length === 0) {
      showSnackbar('No "Only in V2/V4" data to export', 'warning');
      return;
    }
    
    try {
      const loadingSnackbar = showSnackbar('Preparing export...', 'info', 0);
      
      // Prepare data for export
      const exportData = [];
      let rowIndex = 1; // Start serial number from 1
      
      onlyInResults.forEach((result, idx) => {
        const v2Sdns = result.v2?.responses?.length > 0 ? result.v2.responses : [];
        const v4Sdns = result.v4?.responses?.length > 0 ? result.v4.responses : [];
        
        // Find SDNs only in V2 or only in V4
        const onlyInV2 = v2Sdns.filter(v2 => 
          !v4Sdns.some(v4 => v4.rulesDetails?.sdnid === v2.rulesDetails?.sdnid)
        );
        
        const onlyInV4 = v4Sdns.filter(v4 => 
          !v2Sdns.some(v2 => v2.rulesDetails?.sdnid === v4.rulesDetails?.sdnid)
        );
        
        // Format SDNs for export - one row per SDN
        const maxRows = Math.max(onlyInV2.length, onlyInV4.length);
        
        for (let i = 0; i < maxRows; i++) {
          const v2Sdn = onlyInV2[i]?.rulesDetails;
          const v4Sdn = onlyInV4[i]?.rulesDetails;
          
          const v2Text = v2Sdn ? 
            `${v2Sdn.sdnid || 'N/A'} - ${v2Sdn.sdnname || 'N/A'}` : '';
          
          const v4Text = v4Sdn ? 
            `${v4Sdn.sdnid || 'N/A'} - ${v4Sdn.sdnname || 'N/A'}` : '';
          
          const rowData = {
            'Name': i === 0 ? result.name : '',
            'Only in V2': v2Text,
            'Only in V4': v4Text
          };
          
          exportData.push(rowData);
        }
        
        if (maxRows > 0) {
          rowIndex++; // Increment serial number for the next name
        }
      });
      
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 30 }, // Name
        { wch: 60 }, // Only in V2
        { wch: 60 }  // Only in V4
      ];
      
      // Create workbook and add worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Only in V2-V4 Results');
      
      // Generate and save the Excel file
      XLSX.writeFile(wb, `only_in_v2_v4_results_${new Date().toISOString().slice(0, 10)}.xlsx`);
      
      showSnackbar('Export successful!', 'success');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      showSnackbar(`Export failed: ${error.message}`, 'error');
    }
  };

  const exportToExcel = async () => {
    if (results.length === 0) {
      showSnackbar('No data to export', 'warning');
      return;
    }

    try {
      // Show loading indicator
      const loadingSnackbar = showSnackbar('Preparing export...', 'info', 0);
      
      // Check if we have Corporate API data
      const hasCorporateData = results.some(result => 
        result.name && result.name.includes('persons)')
      );
      
      // Process data in chunks to avoid memory issues
      const CHUNK_SIZE = 100;
      const exportData = [];
      
      for (let i = 0; i < results.length; i += CHUNK_SIZE) {
        const chunk = results.slice(i, i + CHUNK_SIZE);
        
        // Process chunk
        for (const result of chunk) {
          if (hasCorporateData) {
            // Check if this is Individual Corporate API mode
            const isIndividualCorporate = processingMode === 'individual' && 
                                         selectedApis.includes('api3') && 
                                         selectedApis.length === 1;
            
            if (isIndividualCorporate) {
              // Handle Individual Corporate API - Excel-like format
              const nameMatch = result.name.match(/^(.+) \((\d+) persons\)$/);
              const entity = nameMatch ? nameMatch[1] : result.name;
              
              // Get the Corporate API timing
              const corporateData = result.corporate;
              const processingTime = corporateData?._timing?.duration || corporateData?._duration || 0;
              
              // Get the original persons data from stored original data
              const originalData = result._originalData;
              const originalRow = originalData?.originalRow || [];
              
              // Find person columns (skip entity column which is index 0)
              const personColumns = [];
              for (let j = 1; j < Math.min(originalRow.length, 4); j++) { // Show up to 3 person columns
                personColumns.push(originalRow[j] || '');
              }
              
              // Ensure we have exactly 3 person columns
              while (personColumns.length < 3) {
                personColumns.push('');
              }
              
              exportData.push({
                'Serial': i + 1,
                'Entity': entity,
                'Person-1': personColumns[0],
                'Person-2': personColumns[1],
                'Person-3': personColumns[2],
                'Processing Time (ms)': processingTime.toFixed(2)
              });
            } else {
              // Handle other Corporate API modes - detailed format
              const nameMatch = result.name.match(/^(.+) \((\d+) persons\)$/);
              const entity = nameMatch ? nameMatch[1] : result.name;
              const personCount = nameMatch ? nameMatch[2] : '0';
              
              // Export each API's results as separate rows
            const apis = ['v2', 'v4', 'corporate'];
            apis.forEach(apiKey => {
              const apiData = result[apiKey];
              if (!apiData) return;
              
              const apiName = apiKey === 'v2' ? 'API1 (V2)' : 
                             apiKey === 'v4' ? 'API2 (V4)' : 
                             'Corporate API';
              
              const processingTime = apiData._timing?.duration || apiData._duration || 0;
              const status = apiData.success !== false ? 'Success' : 'Failed';
              
              if (!apiData.responses || apiData.responses.length === 0) {
                exportData.push({
                  'Serial': i + 1,
                  'Entity': entity,
                  'Persons': personCount,
                  'API Version': apiName,
                  'SDN ID': 'No matches',
                  'SDN Name': 'N/A',
                  'Processing Time (ms)': processingTime.toFixed(2),
                  'Status': status,
                  'Only in V2': result._sdnComparison?.onlyInV2?.length || 0,
                  'Only in V4': result._sdnComparison?.onlyInV4?.length || 0,
                  'Only in Corporate': result._sdnComparison?.onlyInApi3?.length || 0,
                  'Only in Univius': result._sdnComparison?.onlyInUnivius?.length || 0
                });
              } else {
                apiData.responses.forEach(response => {
                  const sdnId = response.rulesDetails?.sdnid || 'N/A';
                  const sdnName = response.rulesDetails?.sdnname || 'N/A';
                  
                  exportData.push({
                    'Serial': i + 1,
                    'Entity': entity,
                    'Persons': personCount,
                    'API Version': apiName,
                    'SDN ID': sdnId,
                    'SDN Name': sdnName,
                    'Processing Time (ms)': processingTime.toFixed(2),
                    'Status': status,
                    'Only in V2': result._sdnComparison?.onlyInV2?.length || 0,
                    'Only in V4': result._sdnComparison?.onlyInV4?.length || 0,
                    'Only in Corporate': result._sdnComparison?.onlyInApi3?.length || 0,
                    'Only in Univius': result._sdnComparison?.onlyInUnivius?.length || 0
                  });
                });
              }
            });
            } // End of else block for other Corporate API modes
          } else {
            // Handle Standard format (existing logic)
            // Get unique SDNs for V2, V4, and Univius
          const v2Sdns = result.v2?.responses?.length > 0
            ? result.v2.responses.map(item => ({
                id: item.rulesDetails?.sdnid || 'N/A',
                name: item.rulesDetails?.sdnname || 'N/A'
              }))
            : [];

          const v4Sdns = result.v4?.responses?.length > 0
            ? result.v4.responses.map(item => ({
                id: item.rulesDetails?.sdnid || 'N/A',
                name: item.rulesDetails?.sdnname || 'N/A'
              }))
            : [];
            
          const univiusSdns = Array.isArray(result.univius)
            ? result.univius.map(item => ({
                id: item.sdnId || 'N/A',
                name: item.sdnName || 'N/A',
                reference: item.listName || ''
              }))
            : [];

          // Find SDNs only in each API
          const onlyInV2 = v2Sdns.filter(v2 => 
            !v4Sdns.some(v4 => v4.id === v2.id) &&
            !univiusSdns.some(u => u.id === v2.id)
          );
          
          const onlyInV4 = v4Sdns.filter(v4 => 
            !v2Sdns.some(v2 => v2.id === v4.id) &&
            !univiusSdns.some(u => u.id === v4.id)
          );
          
          const onlyInUnivius = univiusSdns.filter(u => 
            !v2Sdns.some(v2 => v2.id === u.id) &&
            !v4Sdns.some(v4 => v4.id === u.id)
          );

          // Split SDN lists into chunks that fit within Excel's cell limit
          const v2Chunks = splitSdnsForExport(v2Sdns);
          const onlyV2Chunks = splitSdnsForExport(onlyInV2);
          const v4Chunks = splitSdnsForExport(v4Sdns);
          const onlyV4Chunks = splitSdnsForExport(onlyInV4);
          const univiusChunks = splitSdnsForExport(univiusSdns);
          const onlyUniviusChunks = splitSdnsForExport(onlyInUnivius);
          
          // Get timing information
          const getTimingInfo = (apiResult, apiName) => {
            if (!apiResult) return { duration: 0, totalDuration: 0, preRequest: 0 };
            return {
              duration: apiResult._duration || 0,
              totalDuration: apiResult._totalDuration || 0,
              preRequest: apiResult._timing?.preRequest || 0
            };
          };

          const v2Timing = getTimingInfo(result.v2, 'v2');
          const v4Timing = getTimingInfo(result.v4, 'v4');
          const univiusTiming = getTimingInfo(result.univius, 'univius');
          
          // Calculate which version is faster (using network duration)
          const durations = {
            v2: v2Timing.duration,
            v4: v4Timing.duration,
            univius: univiusTiming.duration
          };
          
          const fastestApi = Object.entries(durations).reduce((a, b) => 
            a[1] > 0 && (a[1] < b[1] || b[1] === 0) ? a : b, ['', Infinity])[0];
          
          // Determine how many rows we'll need for this result
          const maxChunks = Math.max(
            v2Chunks.length,
            onlyV2Chunks.length,
            v4Chunks.length,
            onlyV4Chunks.length,
            univiusChunks.length,
            onlyUniviusChunks.length,
            1 // At least one row
          );
          
          // Check if this is Individual API mode
          const isIndividualMode = processingMode === 'individual';
          
          if (isIndividualMode) {
            // Individual API mode - simple format without comparison columns
            const selectedApi = selectedApis[0]; // Should be only one API selected
            let apiData, apiName, apiTiming;
            
            if (selectedApi === 'api1') {
              apiData = result.v2;
              apiName = 'V2';
              apiTiming = v2Timing;
            } else if (selectedApi === 'api2') {
              apiData = result.v4;
              apiName = 'V4';
              apiTiming = v4Timing;
            } else if (selectedApi === 'univius') {
              apiData = result.univius;
              apiName = 'Univius';
              apiTiming = univiusTiming;
            }
            
            if (apiData) {
              const formatTime = (time) => time ? time.toFixed(2) : 'N/A';
              
              // Handle SDN matches
              if (!apiData.responses || apiData.responses.length === 0) {
                // No matches
                exportData.push({
                  'Serial': i + 1,
                  'Name': result.name,
                  'API Version': apiName,
                  'SDN ID': 'No matches',
                  'SDN Name': 'N/A',
                  'NMP (%)': 'N/A',
                  'OMP (%)': 'N/A',
                  'Processing Time (ms)': formatTime(apiTiming.duration)
                });
              } else {
                // Has matches - create row for each SDN
                apiData.responses.forEach((response, responseIdx) => {
                  const sdnId = response.rulesDetails?.sdnid || 'N/A';
                  const sdnName = response.rulesDetails?.sdnname || 'N/A';
                  
                  exportData.push({
                    'Serial': responseIdx === 0 ? i + 1 : '',
                    'Name': responseIdx === 0 ? result.name : '',
                    'API Version': responseIdx === 0 ? apiName : '',
                    'SDN ID': sdnId,
                    'SDN Name': sdnName,
                    'NMP (%)': response.nameMatchPercentage ? `${response.nameMatchPercentage}%` : 'N/A',
                    'OMP (%)': response.overAllPercentage ? `${response.overAllPercentage}%` : 'N/A',
                    'Processing Time (ms)': responseIdx === 0 ? formatTime(apiTiming.duration) : ''
                  });
                });
              }
            }
          } else {
            // Multi-API modes - detailed format with comparison columns
            // Create rows for this result
            for (let j = 0; j < maxChunks; j++) {
              const isFirstRow = j === 0;
              const formatTime = (time) => time ? time.toFixed(2) : 'N/A';
              
              const rowData = {
                'Name': isFirstRow ? result.name : `(cont.) ${result.name}`,
                
                // V2 Data
                'V2 Network Time (ms)': isFirstRow ? formatTime(v2Timing.duration) : '',
                'V2 Total Time (ms)': isFirstRow ? formatTime(v2Timing.totalDuration) : '',
                'V2 Pre-Request (ms)': isFirstRow ? formatTime(v2Timing.preRequest) : '',
                'V2 SDN Matches': v2Chunks[j]?.content || (isFirstRow ? 'No matches' : ''),
                'Only in V2': onlyV2Chunks[j]?.content || (isFirstRow ? 'No matches' : ''),
                
                // V4 Data
                'V4 Network Time (ms)': isFirstRow ? formatTime(v4Timing.duration) : '',
                'V4 Total Time (ms)': isFirstRow ? formatTime(v4Timing.totalDuration) : '',
                'V4 Pre-Request (ms)': isFirstRow ? formatTime(v4Timing.preRequest) : '',
                'V4 SDN Matches': v4Chunks[j]?.content || (isFirstRow ? 'No matches' : ''),
                'Only in V4': onlyV4Chunks[j]?.content || (isFirstRow ? 'No matches' : ''),
                
                // Univius Data
                'Univius Network Time (ms)': isFirstRow ? formatTime(univiusTiming.duration) : '',
                'Univius Total Time (ms)': isFirstRow ? formatTime(univiusTiming.totalDuration) : '',
                'Univius Pre-Request (ms)': isFirstRow ? formatTime(univiusTiming.preRequest) : '',
                'Univius SDN Matches': univiusChunks[j]?.content || (isFirstRow ? 'No matches' : ''),
                'Only in Univius': onlyUniviusChunks[j]?.content || (isFirstRow ? 'No matches' : ''),
                
                // Comparison
                'Fastest API': isFirstRow ? 
                  (fastestApi === 'v2' ? 'V2' : 
                   fastestApi === 'v4' ? 'V4' : 
                   fastestApi === 'univius' ? 'Univius' : 'N/A') : '',
                
                'Total Duration (ms)': isFirstRow ? formatTime(Math.max(
                  v2Timing.totalDuration,
                  v4Timing.totalDuration,
                  univiusTiming.totalDuration
                )) : ''
              };
              
              exportData.push(rowData);
            }
          }
          } // End of else block for standard format
        } // End of result processing
        
        // Update progress
        const progress = Math.min(100, Math.round(((i + chunk.length) / results.length) * 100));
        showSnackbar(`Processing... ${progress}%`, 'info', 0, loadingSnackbar);
        
        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set initial column widths
      ws['!cols'] = [
        {wch: 30}, // Name
        
        // V2 Columns
        {wch: 15}, // V2 Network Time
        {wch: 15}, // V2 Total Time
        {wch: 15}, // V2 Pre-Request
        {wch: 40}, // V2 SDN Matches
        {wch: 40}, // Only in V2
        
        // V4 Columns
        {wch: 15}, // V4 Network Time
        {wch: 15}, // V4 Total Time
        {wch: 15}, // V4 Pre-Request
        {wch: 40}, // V4 SDN Matches
        {wch: 40}, // Only in V4
        
        // Univius Columns
        {wch: 15}, // Univius Network Time
        {wch: 15}, // Univius Total Time
        {wch: 15}, // Univius Pre-Request
        {wch: 40}, // Univius SDN Matches
        {wch: 40}, // Only in Univius
        
        // Comparison Columns
        {wch: 15}, // Fastest API
        {wch: 15}  // Total Duration
      ];
      
      // Create workbook and add worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Screening Results');
      
      // Add styling to all cells
      const range = XLSX.utils.decode_range(ws['!ref']);
      
      // Style header row
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = ws[XLSX.utils.encode_cell({r: 0, c: C})];
        if (cell) {
          cell.s = { 
            font: { bold: true },
            fill: { fgColor: { rgb: 'D3D3D3' } },
            alignment: { 
              wrapText: true, 
              vertical: 'top',
              horizontal: 'center'
            },
            border: {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' }
            }
          };
        }
      }
      
      // Style data rows with wrap text and borders
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        // Set row height to auto
        if (!ws['!rows']) ws['!rows'] = [];
        ws['!rows'][R] = { hpx: 'auto', hpt: 'auto' };
        
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell = ws[XLSX.utils.encode_cell({r: R, c: C})];
          if (cell) {
            // Preserve existing styles if any
            const existingStyle = cell.s || {};
            cell.s = {
              ...existingStyle,
              alignment: { 
                wrapText: true, 
                vertical: 'top',
                ...(existingStyle.alignment || {})
              },
              border: {
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' },
                ...(existingStyle.border || {})
              }
            };
          }
        }
      }
      
      // Set explicit column widths for better readability
      ws['!cols'] = [
        { wch: 30 }, // Name
        
        // V2 Columns
        { wch: 15 },  // V2 Duration
        { wch: 50 },  // V2 SDN Matches
        { wch: 50 },  // Only in V2
        
        // V4 Columns
        { wch: 15 },  // V4 Duration
        { wch: 50 },  // V4 SDN Matches
        { wch: 50 },  // Only in V4
        
        // Univius Columns
        { wch: 15 },  // Univius Duration
        { wch: 50 },  // Univius SDN Matches
        { wch: 50 },  // Only in Univius
        
        // Comparison Columns
        { wch: 15 },  // Fastest API
        { wch: 18 }   // Total Duration
      ];
      
      // Add some visual separation between API sections
      const headerRow = ws[XLSX.utils.encode_cell({r: 0, c: 0})];
      if (headerRow) {
        headerRow.s = {
          ...headerRow.s,
          fill: { fgColor: { rgb: 'E6E6E6' } },
          font: { bold: true, color: { rgb: '333333' } }
        };
      }
      
      // Style the duration columns for better readability
      const durationColumns = [1, 4, 7]; // Indices of duration columns
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        durationColumns.forEach(col => {
          const cell = ws[XLSX.utils.encode_cell({r: R, c: col})];
          if (cell) {
            cell.s = {
              ...cell.s,
              numFmt: '0.00',
              alignment: { ...(cell.s?.alignment || {}), horizontal: 'right' }
            };
          }
        });
      }
      
      // Generate and save the Excel file
      showSnackbar('Generating Excel file...', 'info', 0, loadingSnackbar);
      
      // Use writeFile with options for better performance
      XLSX.writeFile(wb, `screening_results_${new Date().toISOString().slice(0, 10)}.xlsx`, {
        bookType: 'xlsx',
        type: 'array',
        compression: true
      });
      
      showSnackbar('Export successful!', 'success');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      showSnackbar(`Export failed: ${error.message}`, 'error');
    }
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    
    // When switching to only-in tab, prepare the data
    if (newValue === 'onlyIn') {
      const onlyInData = results.filter(result => {
        const v2Sdns = result.v2?.responses?.length > 0 ? result.v2.responses : [];
        const v4Sdns = result.v4?.responses?.length > 0 ? result.v4.responses : [];
        
        // Find SDNs only in V2 or only in V4
        const onlyInV2 = v2Sdns.filter(v2 => 
          !v4Sdns.some(v4 => v4.rulesDetails?.sdnid === v2.rulesDetails?.sdnid)
        );
        
        const onlyInV4 = v4Sdns.filter(v4 => 
          !v2Sdns.some(v2 => v2.rulesDetails?.sdnid === v4.rulesDetails?.sdnid)
        );
        
        return onlyInV2.length > 0 || onlyInV4.length > 0;
      });
      
      setOnlyInResults(onlyInData);
    }
  };

  // Helper function to render SDN list
  const renderSdnList = (sdns, isUnivius = false) => {
    if (!sdns || sdns.length === 0) {
      return <Typography color="textSecondary">No matches</Typography>;
    }

    return (
      <Box sx={{ maxHeight: '200px', overflowY: 'auto' }}>
        {sdns.map((sdn, index) => (
          <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>ID:</strong> {sdn.id}<br />
              <strong>Name:</strong> {sdn.name}<br />
              {sdn.reference && (
                <>
                  <strong>Reference:</strong> {sdn.reference}
                </>
              )}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  };

  // Helper function to render API result card
  const renderApiResultCard = (title, data, durationKey, isLoading = false) => {
    if (isLoading) {
      return (
        <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" gutterBottom>{title}</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress size={24} />
          </Box>
        </Paper>
      );
    }

    const duration = data?.[durationKey];
    const sdns = Array.isArray(data) ? data : [];
    
    return (
      <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{title}</Typography>
          {duration && (
            <Chip 
              label={`${duration.toFixed(2)} ms`} 
              color="primary" 
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          )}
        </Box>
        {renderSdnList(sdns, title === 'Univius')}
      </Paper>
    );
  };

  const renderResults = () => {
    if (results.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            No results to display. Process a file to see the results.
          </Typography>
        </Box>
      );
    }

    // Check if we have Corporate API data
    const hasCorporateData = results.some(result => 
      result.name && result.name.includes('persons)')
    );

    // Function to render Corporate API rows
    const renderCorporateRows = (result, idx, serialNumber, version) => {
      // Check if this is Individual Corporate API mode
      const isIndividualCorporate = processingMode === 'individual' && 
                                   selectedApis.includes('api3') && 
                                   selectedApis.length === 1;
      
      if (isIndividualCorporate) {
        // For Individual Corporate API, show Excel-like format
        // Parse the original data to get entity and persons
        const nameMatch = result.name.match(/^(.+) \((\d+) persons\)$/);
        const entity = nameMatch ? nameMatch[1] : result.name;
        
        // Get the Corporate API timing
        const corporateData = result.corporate;
        const processingTime = corporateData?._timing?.duration || corporateData?._duration || 0;
        
        // Get the original persons data from stored original data
        const originalData = result._originalData;
        const originalRow = originalData?.originalRow || [];
        
        // Find person columns (skip entity column which is index 0)
        const personColumns = [];
        for (let i = 1; i < Math.min(originalRow.length, 4); i++) { // Show up to 3 person columns
          personColumns.push(originalRow[i] || '');
        }
        
        // Ensure we have exactly 3 person columns
        while (personColumns.length < 3) {
          personColumns.push('');
        }
        
        return (
          <TableRow key={`corporate-simple-${idx}`}>
            <TableCell>{serialNumber}</TableCell>
            <TableCell>{entity}</TableCell>
            {personColumns.map((person, personIdx) => (
              <TableCell key={`person-${personIdx}`}>
                {person}
              </TableCell>
            ))}
            <TableCell>{processingTime.toFixed(2)} ms</TableCell>
          </TableRow>
        );
      } else {
        // For other modes, show detailed API response format
        const nameMatch = result.name.match(/^(.+) \((\d+) persons\)$/);
        const entity = nameMatch ? nameMatch[1] : result.name;
        const personCount = nameMatch ? nameMatch[2] : '0';
        
        // Get API data
        const apis = ['v2', 'v4', 'corporate'];
        const rows = [];
        
        apis.forEach((apiKey, apiIdx) => {
          const apiData = result[apiKey];
          if (!apiData) return;
          
          const apiName = apiKey === 'v2' ? 'API1 (V2)' : 
                         apiKey === 'v4' ? 'API2 (V4)' : 
                         'Corporate API';
          
          const processingTime = apiData._timing?.duration || apiData._duration || 0;
          const status = apiData.success !== false ? 'Success' : 'Failed';
          
          // Handle responses
          if (!apiData.responses || apiData.responses.length === 0) {
            rows.push(
              <TableRow key={`${apiKey}-${idx}-no-match`}>
                {apiIdx === 0 && (
                  <>
                    <TableCell rowSpan={apis.filter(key => result[key]).length}>
                      {serialNumber}
                    </TableCell>
                    <TableCell rowSpan={apis.filter(key => result[key]).length}>
                      {entity}
                    </TableCell>
                    <TableCell rowSpan={apis.filter(key => result[key]).length}>
                      {personCount}
                    </TableCell>
                  </>
                )}
                <TableCell>{apiName}</TableCell>
                <TableCell>No matches</TableCell>
                <TableCell>N/A</TableCell>
                <TableCell>{processingTime.toFixed(2)}</TableCell>
                <TableCell>{status}</TableCell>
                {version === 'combined' && (
                  <>
                    <TableCell>{result._sdnComparison?.onlyInV2?.length || 0}</TableCell>
                    <TableCell>{result._sdnComparison?.onlyInV4?.length || 0}</TableCell>
                    <TableCell>{result._sdnComparison?.onlyInApi3?.length || 0}</TableCell>
                    <TableCell>{result._sdnComparison?.onlyInUnivius?.length || 0}</TableCell>
                  </>
                )}
              </TableRow>
            );
          } else {
            // Render rows for each SDN match
            apiData.responses.forEach((response, responseIdx) => {
              const sdnId = response.rulesDetails?.sdnid || 'N/A';
              const sdnName = response.rulesDetails?.sdnname || 'N/A';
              
              rows.push(
                <TableRow key={`${apiKey}-${idx}-${responseIdx}`}>
                  {apiIdx === 0 && responseIdx === 0 && (
                    <>
                      <TableCell rowSpan={apis.reduce((total, key) => {
                        const data = result[key];
                        return total + (data?.responses?.length || 1);
                      }, 0)}>
                        {serialNumber}
                      </TableCell>
                      <TableCell rowSpan={apis.reduce((total, key) => {
                        const data = result[key];
                        return total + (data?.responses?.length || 1);
                      }, 0)}>
                        {entity}
                      </TableCell>
                      <TableCell rowSpan={apis.reduce((total, key) => {
                        const data = result[key];
                        return total + (data?.responses?.length || 1);
                      }, 0)}>
                        {personCount}
                      </TableCell>
                    </>
                  )}
                  {responseIdx === 0 && (
                    <TableCell rowSpan={apiData.responses.length}>
                      {apiName}
                    </TableCell>
                  )}
                  <TableCell>{sdnId}</TableCell>
                  <TableCell>{sdnName}</TableCell>
                  {responseIdx === 0 && (
                    <>
                      <TableCell rowSpan={apiData.responses.length}>
                        {processingTime.toFixed(2)}
                      </TableCell>
                      <TableCell rowSpan={apiData.responses.length}>
                        {status}
                      </TableCell>
                      {version === 'combined' && (
                        <>
                          <TableCell rowSpan={apiData.responses.length}>
                            {result._sdnComparison?.onlyInV2?.length || 0}
                          </TableCell>
                          <TableCell rowSpan={apiData.responses.length}>
                            {result._sdnComparison?.onlyInV4?.length || 0}
                          </TableCell>
                          <TableCell rowSpan={apiData.responses.length}>
                            {result._sdnComparison?.onlyInApi3?.length || 0}
                          </TableCell>
                          <TableCell rowSpan={apiData.responses.length}>
                            {result._sdnComparison?.onlyInUnivius?.length || 0}
                          </TableCell>
                        </>
                      )}
                    </>
                  )}
                </TableRow>
              );
            });
          }
        });
        
        return rows;
      }
    };

    const renderTable = (version = 'combined') => {
      // Define headers based on data type
      let headers;
      
      if (hasCorporateData) {
        // Check if this is Individual Corporate API mode
        const isIndividualCorporate = processingMode === 'individual' && 
                                     selectedApis.includes('api3') && 
                                     selectedApis.length === 1;
        
        if (isIndividualCorporate) {
          // Excel-like format headers for Individual Corporate API
          headers = [
            '#', 'Entity', 'Person-1', 'Person-2', 'Person-3', 'Processing Time (ms)'
          ];
        } else {
          // Corporate API format headers for other modes
          headers = [
            '#', 'Entity', 'Persons', 'API Version', 'SDN ID', 'SDN Name', 
            'Processing Time (ms)', 'Status'
          ];
          
          // Add comparison columns for combined view
          if (version === 'combined') {
            headers = [
              ...headers,
              'Only in V2', 
              'Only in V4',
              'Only in Corporate',
              'Only in Univius'
            ];
          }
        }
      } else {
        // Standard format headers
        // Check if this is Individual API mode
        const isIndividualMode = processingMode === 'individual';
        
        if (isIndividualMode) {
          // Individual API mode - no comparison columns
          headers = [
            '#', 'Name', 'API Version', 'SDN ID', 'SDN Name', 'NMP (%)', 'OMP (%)', 'Processing Time (ms)'
          ];
        } else {
          // Multi-API modes - include comparison columns
          const baseHeaders = [
            '#', 'Name', 'API Version', 'SDN ID', 'SDN Name', 'Processing Time (ms)', 
            'V2 Faster?', 'V4 Faster?'
          ];
          
          // For combined view, add additional columns
          const combinedHeaders = [
            ...baseHeaders.slice(0, -2), // Remove the last two columns (V2/V4 Faster?)
            'V2 Faster?', 
            'V4 Faster?',
            'Only in V2', 
            'Only in V4',
          ];
          
          headers = version === 'combined' ? combinedHeaders : baseHeaders;
        }
      }

      const renderSdnDifferences = (sdns) => {
        if (!sdns?.length) return 'N/A';
        
        return (
          <Box>
            {sdns.map((sdn, i) => (
              <div key={`sdn-diff-${i}`}>
                <strong>{sdn.id}</strong>: {sdn.name}
                {sdn.reference && ` (${sdn.reference})`}
              </div>
            ))}
          </Box>
        );
      };

      return (
        <TableContainer component={Paper} sx={{ mt: 2, maxHeight: '70vh', overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {headers.map((header, idx) => (
                  <TableCell key={idx} style={{ fontWeight: 'bold' }}>{header}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((result, idx) => {
                const serialNumber = idx + 1;
                
                if (result.error) {
                  return (
                    <TableRow key={`error-${idx}`} style={{ backgroundColor: '#ffebee' }}>
                      <TableCell>{serialNumber}</TableCell>
                      <TableCell colSpan={headers.length - 1} align="center">
                        <Typography color="error">
                          {result.name}: {result.error}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                }

                // Handle Corporate API format
                if (hasCorporateData) {
                  return renderCorporateRows(result, idx, serialNumber, version);
                }

                const renderVersionRows = (versionKey) => {
                  const versionData = result[versionKey];
                  if (!versionData) return null;

                  // If no matches, return a single row with 'No matches'
                  if (!versionData?.responses?.length) {
                    return (
                      <TableRow key={`${versionKey}-${idx}-no-match`}>
                        <TableCell>{serialNumber}</TableCell>
                        <TableCell>{result.name}</TableCell>
                        <TableCell>{versionKey.toUpperCase()}</TableCell>
                        <TableCell>No matches</TableCell>
                        <TableCell>N/A</TableCell>
                        {/* Add NMP and OMP columns for Individual mode */}
                        {processingMode === 'individual' && (
                          <>
                            <TableCell>N/A</TableCell>
                            <TableCell>N/A</TableCell>
                          </>
                        )}
                        <TableCell>
                          {versionData?._duration ? `${versionData._duration.toFixed(2)} ms` : 'N/A'}
                        </TableCell>
                        {/* Only show comparison columns for non-individual modes */}
                        {processingMode !== 'individual' && version === 'combined' && result.v2?._duration && result.v4?._duration && (
                          <>
                            <TableCell 
                              style={{
                                backgroundColor: result.v2._duration < result.v4._duration ? 'rgba(0, 200, 0, 0.1)' : 'transparent',
                                color: result.v2._duration < result.v4._duration ? 'green' : 'inherit'
                              }}
                            >
                              {result.v2._duration < result.v4._duration ? '✓' : ''}
                            </TableCell>
                            <TableCell 
                              style={{
                                backgroundColor: result.v4._duration < result.v2._duration ? 'rgba(0, 200, 0, 0.1)' : 'transparent',
                                color: result.v4._duration < result.v4._duration ? 'green' : 'inherit'
                              }}
                            >
                              {result.v4._duration < result.v2._duration ? '✓' : ''}
                            </TableCell>
                          </>
                        )}
                        {processingMode !== 'individual' && version === 'combined' && (
                          <>
                            <TableCell>N/A</TableCell>
                            <TableCell>N/A</TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  }

                  // For each response, create a row with separate columns for ID and Name
                  return versionData.responses.map((item, i) => {
                    const sdnId = item.rulesDetails?.sdnid || 'N/A';
                    const sdnName = item.rulesDetails?.sdnname || 'N/A';
                    
                    return (
                      <TableRow key={`${versionKey}-${idx}-${i}`}>
                        {i === 0 ? (
                          <>
                            <TableCell rowSpan={versionData.responses.length}>
                              {serialNumber}
                            </TableCell>
                            <TableCell rowSpan={versionData.responses.length}>
                              {result.name}
                            </TableCell>
                            <TableCell rowSpan={versionData.responses.length}>
                              {versionKey.toUpperCase()}
                            </TableCell>
                          </>
                        ) : null}
                        <TableCell>{sdnId}</TableCell>
                        <TableCell>{sdnName}</TableCell>
                        {/* Add NMP and OMP columns for Individual mode */}
                        {processingMode === 'individual' && (
                          <>
                            <TableCell>{item.nameMatchPercentage ? `${item.nameMatchPercentage}%` : 'N/A'}</TableCell>
                            <TableCell>{item.overAllPercentage ? `${item.overAllPercentage}%` : 'N/A'}</TableCell>
                          </>
                        )}
                        {i === 0 && (
                          <>
                            <TableCell rowSpan={versionData.responses.length}>
                              {versionData?._duration ? `${versionData._duration.toFixed(2)} ms` : 'N/A'}
                            </TableCell>
                            {/* Only show comparison columns for non-individual modes */}
                            {processingMode !== 'individual' && version === 'combined' && result.v2?._duration && result.v4?._duration && (
                              <>
                                <TableCell 
                                  rowSpan={versionData.responses.length}
                                  style={{
                                    backgroundColor: result.v2._duration < result.v4._duration ? 'rgba(0, 200, 0, 0.1)' : 'transparent',
                                    color: result.v2._duration < result.v4._duration ? 'green' : 'inherit'
                                  }}
                                >
                                  {result.v2._duration < result.v4._duration ? '✓' : ''}
                                </TableCell>
                                <TableCell 
                                  rowSpan={versionData.responses.length}
                                  style={{
                                    backgroundColor: result.v4._duration < result.v2._duration ? 'rgba(0, 200, 0, 0.1)' : 'transparent',
                                    color: result.v4._duration < result.v2._duration ? 'green' : 'inherit'
                                  }}
                                >
                                  {result.v4._duration < result.v2._duration ? '✓' : ''}
                                </TableCell>
                              </>
                            )}
                            {processingMode !== 'individual' && version === 'combined' && (
                              <>
                                <TableCell rowSpan={versionData.responses.length}>
                                  {renderSdnDifferences(result._sdnComparison?.onlyInV2)}
                                </TableCell>
                                <TableCell rowSpan={versionData.responses.length}>
                                  {renderSdnDifferences(result._sdnComparison?.onlyInV4)}
                                </TableCell>
                              </>
                            )}
                          </>
                        )}
                      </TableRow>
                    );
                  });
                };

                switch (version) {
                  case 'v2':
                    return renderVersionRows('v2');
                  case 'v4':
                    return renderVersionRows('v4');
                  default:
                    return (
                      <React.Fragment key={`combined-${idx}`}>
                        {result.v2 && renderVersionRows('v2')}
                        {result.v4 && renderVersionRows('v4')}
                      </React.Fragment>
                    );
                }
              })}
            </TableBody>
          </Table>
        </TableContainer>
      );
    };

    return (
      <Box sx={{ mt: 3 }}>
        <Tabs 
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          aria-label="results tabs"
        >
          <Tab value="combined" label="Combined Results" />
          <Tab 
            value="onlyIn" 
            label="Only in V2/V4" 
            disabled={results.length === 0}
          />
        </Tabs>
        
        {activeTab === 'combined' && renderTable('combined')}
        {activeTab === 'onlyIn' && (
          <TableContainer component={Paper} sx={{ mt: 2, maxHeight: '70vh', overflow: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell style={{ fontWeight: 'bold', width: '80px' }}>S.No.</TableCell>
                  <TableCell style={{ fontWeight: 'bold' }}>Name</TableCell>
                  <TableCell style={{ fontWeight: 'bold' }}>Only in V2</TableCell>
                  <TableCell style={{ fontWeight: 'bold' }}>Only in V4</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {onlyInResults.map((result, idx) => {
                  const serialNumber = idx + 1;
                  
                  if (result.error) {
                    return (
                      <TableRow key={`error-${idx}`} style={{ backgroundColor: '#ffebee' }}>
                        <TableCell>{serialNumber}</TableCell>
                        <TableCell colSpan={2} align="center">
                          <Typography color="error">
                            {result.name}: {result.error}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  const v2Sdns = result.v2?.responses?.length > 0 ? result.v2.responses : [];
                  const v4Sdns = result.v4?.responses?.length > 0 ? result.v4.responses : [];

                  // Find SDNs only in V2 or only in V4
                  const onlyInV2 = v2Sdns.filter(v2 => 
                    !v4Sdns.some(v4 => v4.rulesDetails?.sdnid === v2.rulesDetails?.sdnid)
                  );
                  
                  const onlyInV4 = v4Sdns.filter(v4 => 
                    !v2Sdns.some(v2 => v2.rulesDetails?.sdnid === v4.rulesDetails?.sdnid)
                  );

                  return (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{result.name}</TableCell>
                      <TableCell>
                        {onlyInV2.map((sdn, i) => {
                          const sdnId = sdn.rulesDetails?.sdnid || 'N/A';
                          const sdnName = sdn.rulesDetails?.sdnname || 'N/A';
                          return (
                            <div key={`sdn-v2-${i}`} style={{ marginBottom: '4px' }}>
                              <strong>{i + 1}. {sdnId}</strong>: {sdnName}
                            </div>
                          );
                        })}
                        {onlyInV2.length === 0 && <div>-</div>}
                      </TableCell>
                      <TableCell>
                        {onlyInV4.map((sdn, i) => {
                          const sdnId = sdn.rulesDetails?.sdnid || 'N/A';
                          const sdnName = sdn.rulesDetails?.sdnname || 'N/A';
                          return (
                            <div key={`sdn-v4-${i}`} style={{ marginBottom: '4px' }}>
                              <strong>{i + 1}. {sdnId}</strong>: {sdnName}
                            </div>
                          );
                        })}
                        {onlyInV4.length === 0 && <div>-</div>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  };

  const handleSettingsOpen = () => setSettingsOpen(true);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  const handleSettingsClose = () => {
    setSettingsOpen(false);
    setConnectionStatus(null);
  };

  const handleConfigChange = (api, field, value, isKeycloak = false, isProcessing = false) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      if (isProcessing) {
        newConfig.processing[field] = value;
      } else if (isKeycloak) {
        newConfig[api].keycloak[field] = value;
      } else if (field === 'url') {
        newConfig[api].url = value;
      }
      return newConfig;
    });
    setConnectionStatus(null); // Reset status when config changes
  };

  const testKeycloakConnection = async (apiName) => {
    setIsTestingConnection(true);
    setConnectionStatus(null);
    
    try {
      const apiConfig = config[apiName];
      
      // Test the connection
      const testApi = axios.create({
        baseURL: apiConfig.url,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000 // 10 second timeout for testing
      });
      
      const params = new URLSearchParams();
      params.append('client_id', apiConfig.keycloak.clientId);
      params.append('username', apiConfig.keycloak.username);
      params.append('password', apiConfig.keycloak.password);
      params.append('grant_type', 'password');
      
      const tokenUrl = `${apiConfig.keycloak.url}/realms/${apiConfig.keycloak.realm}/protocol/openid-connect/token`;
      
      const response = await testApi.post(tokenUrl, params);
      
      if (response.data?.access_token) {
        setConnectionStatus({ 
          type: 'success', 
          message: `Successfully connected to ${apiName} Keycloak!` 
        });
      } else {
        setConnectionStatus({ 
          type: 'error', 
          message: `Connection to ${apiName} successful but no token received` 
        });
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      let message = error.message;
      
      if (error.response) {
        if (error.response.status === 401) {
          message = 'Invalid credentials';
        } else if (error.response.status === 404) {
          message = 'Keycloak endpoint not found. Check the URL and realm.';
        } else {
          message = `Server error: ${error.response.status} ${error.response.statusText}`;
        }
      } else if (error.code === 'ECONNABORTED') {
        message = 'Connection timed out. Check the server URL and your network connection.';
      } else if (error.request) {
        message = 'No response from server. Check the URL and ensure the server is running.';
      }
      
      setConnectionStatus({ type: 'error', message });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      setConfig(DEFAULT_CONFIG);
    }
  };

  // Show loading state until config is loaded
  if (!configLoaded) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
        <Box ml={2}>Loading configuration...</Box>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          API Matcher
        </Typography>
        <Tooltip title="Settings">
          <IconButton onClick={handleSettingsOpen} color="primary">
            <Settings />
          </IconButton>
        </Tooltip>
      </Box>

      {initializing ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Initializing...
          </Typography>
        </Box>
      ) : (
        <>
          {/* API Selection Controls */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                API Selection
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Processing Mode</InputLabel>
                  <Select
                    value={processingMode}
                    label="Processing Mode"
                    onChange={(e) => handleProcessingModeChange(e.target.value)}
                  >
                    <MenuItem value="all">All APIs</MenuItem>
                    <MenuItem value="selected">Selected APIs</MenuItem>
                    <MenuItem value="individual">Individual API</MenuItem>
                  </Select>
                </FormControl>
                
                {(processingMode === 'selected' || processingMode === 'individual') && (
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary">
                      {processingMode === 'individual' ? 'Select API:' : 'Select APIs:'}
                    </Typography>
                    
                    {processingMode === 'individual' ? (
                      <RadioGroup
                        row
                        value={selectedApis[0] || ''}
                        onChange={(e) => setSelectedApis([e.target.value])}
                      >
                        <FormControlLabel
                          value="api1"
                          control={<Radio />}
                          label="API 1 (V2)"
                        />
                        <FormControlLabel
                          value="api2"
                          control={<Radio />}
                          label="API 2 (V4)"
                        />
                        <FormControlLabel
                          value="api3"
                          control={<Radio />}
                          label="Corporate API"
                        />
                      </RadioGroup>
                    ) : (
                      <FormGroup row>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedApis.includes('api1')}
                              onChange={(e) => {
                                setSelectedApis(prev => 
                                  e.target.checked 
                                    ? [...prev, 'api1']
                                    : prev.filter(api => api !== 'api1')
                                );
                              }}
                            />
                          }
                          label="API 1 (V2)"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedApis.includes('api2')}
                              onChange={(e) => {
                                setSelectedApis(prev => 
                                  e.target.checked 
                                    ? [...prev, 'api2']
                                    : prev.filter(api => api !== 'api2')
                                );
                              }}
                            />
                          }
                          label="API 2 (V4)"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedApis.includes('api3')}
                              onChange={(e) => {
                                setSelectedApis(prev => 
                                  e.target.checked 
                                    ? [...prev, 'api3']
                                    : prev.filter(api => api !== 'api3')
                                );
                              }}
                            />
                          }
                          label="Corporate API"
                        />
                      </FormGroup>
                    )}
                  </Box>
                )}
                
                {processingMode !== 'all' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label={`${selectedApis.length} API${selectedApis.length !== 1 ? 's' : ''} selected`}
                      color={selectedApis.length > 0 ? 'primary' : 'default'}
                      size="small"
                    />
                  </Box>
                )}
              </Box>
              
              {processingMode !== 'all' && selectedApis.length === 0 && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  Please select at least one API to proceed.
                </Typography>
              )}
            </CardContent>
          </Card>
        
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <input
            accept=".xlsx, .xls"
            style={{ display: 'none' }}
            id="excel-file"
            type="file"
            onChange={handleFileChange}
          />
          <label htmlFor="excel-file">
            <Button
              variant="contained"
              component="span"
              startIcon={<UploadFileIcon />}
            >
              {file ? file.name : 'Select Excel File'}
            </Button>
          </label>
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleProcessFile}
            disabled={!file || loading || (processingMode !== 'all' && selectedApis.length === 0)}
            startIcon={loading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
          >
            {loading ? 'Processing...' : 'Process'}
          </Button>
          
          <Box sx={{ mt: 2, display: 'flex', gap: 2, width: '100%' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={exportToExcel}
              disabled={results.length === 0}
              startIcon={<Download />}
            >
              Export All to Excel
            </Button>
            
            <Button
              variant="outlined"
              color="primary"
              onClick={exportOnlyInToExcel}
              disabled={onlyInResults.length === 0}
              startIcon={<Download />}
            >
              Export Only in V2/V4/Univius
            </Button>
          </Box>
          
          {/* Render the results table */}
          {results.length > 0 && (
            <Box sx={{ width: '100%', mt: 3 }}>
              {renderResults()}
            </Box>
          )}
        </Box>
        </>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={handleSettingsClose} maxWidth="md" fullWidth>
        <DialogTitle>Application Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* API 1 Section */}
            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">API 1 Configuration</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => testKeycloakConnection('api1')}
                  disabled={isTestingConnection}
                  startIcon={isTestingConnection ? <CircularProgress size={20} /> : null}
                >
                  {isTestingConnection ? 'Testing...' : 'Test Connection'}
                </Button>
              </Box>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                <TextField
                  label="API 1 URL"
                  value={config.api1.url}
                  onChange={(e) => handleConfigChange('api1', 'url', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="https://example.com/api/v1"
                />
                
                <Box sx={{ gridColumn: '1 / -1', mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2">Keycloak Configuration</Typography>
                  </Box>
                  <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                    <TextField
                      label="Keycloak URL"
                      value={config.api1.keycloak.url}
                      onChange={(e) => handleConfigChange('api1', 'url', e.target.value, true)}
                      fullWidth
                      size="small"
                      disabled={isTestingConnection}
                    />
                    <TextField
                      label="Realm"
                      value={config.api1.keycloak.realm}
                      onChange={(e) => handleConfigChange('api1', 'realm', e.target.value, true)}
                      fullWidth
                      size="small"
                      disabled={isTestingConnection}
                    />
                    <TextField
                      label="Client ID"
                      value={config.api1.keycloak.clientId}
                      onChange={(e) => handleConfigChange('api1', 'clientId', e.target.value, true)}
                      fullWidth
                      size="small"
                      disabled={isTestingConnection}
                    />
                    <TextField
                      label="Username"
                      value={config.api1.keycloak.username}
                      onChange={(e) => handleConfigChange('api1', 'username', e.target.value, true)}
                      fullWidth
                      size="small"
                      disabled={isTestingConnection}
                    />
                    <TextField
                      label="Password"
                      type="password"
                      value={config.api1.keycloak.password}
                      onChange={(e) => handleConfigChange('api1', 'password', e.target.value, true)}
                      fullWidth
                      size="small"
                      disabled={isTestingConnection}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* API 2 Section */}
            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">API 2 Configuration</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => testKeycloakConnection('api2')}
                  disabled={isTestingConnection}
                  startIcon={isTestingConnection ? <CircularProgress size={20} /> : null}
                >
                  {isTestingConnection ? 'Testing...' : 'Test Connection'}
                </Button>
              </Box>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                <TextField
                  label="API 2 URL"
                  value={config.api2.url}
                  onChange={(e) => handleConfigChange('api2', 'url', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="https://example.com/api/v2"
                />
                
                <Box sx={{ gridColumn: '1 / -1', mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2">Keycloak Configuration</Typography>
                  </Box>
                  <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                    <TextField
                      label="Keycloak URL"
                      value={config.api2.keycloak.url}
                      onChange={(e) => handleConfigChange('api2', 'url', e.target.value, true)}
                      fullWidth
                      size="small"
                      disabled={isTestingConnection}
                    />
                    <TextField
                      label="Realm"
                      value={config.api2.keycloak.realm}
                      onChange={(e) => handleConfigChange('api2', 'realm', e.target.value, true)}
                      fullWidth
                      size="small"
                      disabled={isTestingConnection}
                    />
                    <TextField
                      label="Client ID"
                      value={config.api2.keycloak.clientId}
                      onChange={(e) => handleConfigChange('api2', 'clientId', e.target.value, true)}
                      fullWidth
                      size="small"
                      disabled={isTestingConnection}
                    />
                    <TextField
                      label="Username"
                      value={config.api2.keycloak.username}
                      onChange={(e) => handleConfigChange('api2', 'username', e.target.value, true)}
                      fullWidth
                      size="small"
                      disabled={isTestingConnection}
                    />
                    <TextField
                      label="Password"
                      type="password"
                      value={config.api2.keycloak.password}
                      onChange={(e) => handleConfigChange('api2', 'password', e.target.value, true)}
                      fullWidth
                      size="small"
                      disabled={isTestingConnection}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* API 3 Section */}
            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Corporate API Configuration</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => testKeycloakConnection('api3')}
                  disabled={isTestingConnection}
                  startIcon={isTestingConnection ? <CircularProgress size={20} /> : null}
                >
                  {isTestingConnection ? 'Testing...' : 'Test Connection'}
                </Button>
              </Box>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                <TextField
                  label="Corporate API URL"
                  value={config.api3.url}
                  onChange={(e) => handleConfigChange('api3', 'url', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="https://example.com/api/v3"
                />
                
                <Box sx={{ gridColumn: '1 / -1', mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2">Keycloak Configuration</Typography>
                  </Box>
                  <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                    <TextField
                      label="Keycloak URL"
                      value={config.api3.keycloak.url}
                      onChange={(e) => handleConfigChange('api3', 'url', e.target.value, true)}
                      fullWidth
                      size="small"
                      disabled={isTestingConnection}
                    />
                    <TextField
                      label="Realm"
                      value={config.api3.keycloak.realm}
                      onChange={(e) => handleConfigChange('api3', 'realm', e.target.value, true)}
                      fullWidth
                      size="small"
                      disabled={isTestingConnection}
                    />
                    <TextField
                      label="Client ID"
                      value={config.api3.keycloak.clientId}
                      onChange={(e) => handleConfigChange('api3', 'clientId', e.target.value, true)}
                      fullWidth
                      size="small"
                      disabled={isTestingConnection}
                    />
                    <TextField
                      label="Username"
                      value={config.api3.keycloak.username}
                      onChange={(e) => handleConfigChange('api3', 'username', e.target.value, true)}
                      fullWidth
                      size="small"
                      disabled={isTestingConnection}
                    />
                    <TextField
                      label="Password"
                      type="password"
                      value={config.api3.keycloak.password}
                      onChange={(e) => handleConfigChange('api3', 'password', e.target.value, true)}
                      fullWidth
                      size="small"
                      disabled={isTestingConnection}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Processing Configuration Section */}
            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Processing Configuration</Typography>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                <TextField
                  label="Think Time (milliseconds)"
                  type="number"
                  value={config.processing?.thinkTimeMs || 0}
                  onChange={(e) => handleConfigChange(null, 'thinkTimeMs', parseInt(e.target.value) || 0, false, true)}
                  fullWidth
                  size="small"
                  helperText="Delay between processing each name (0 = no delay)"
                  inputProps={{ min: 0, max: 60000, step: 100 }}
                  disabled={isTestingConnection}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', pl: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Current: {config.processing?.thinkTimeMs || 0}ms
                    {config.processing?.thinkTimeMs > 0 && (
                      <> ({(config.processing.thinkTimeMs / 1000).toFixed(1)}s)</>
                    )}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Think time adds a delay between processing each name to avoid overwhelming the APIs.
                  Recommended: 500-2000ms for production use.
                </Typography>
              </Box>
            </Box>

            {connectionStatus && (
              <Box sx={{ 
                gridColumn: '1 / -1',
                p: 2,
                borderRadius: 1,
                bgcolor: connectionStatus.type === 'success' ? 'success.light' : 'error.light',
                color: 'white'
              }}>
                {connectionStatus.message}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          {/* <Button 
            onClick={testKeycloakConnection} 
            color="primary"
            variant="outlined"
            disabled={isTestingConnection}
            startIcon={isTestingConnection ? <CircularProgress size={20} /> : null}
          >
            {isTestingConnection ? 'Testing...' : 'Test Connection'}
          </Button> */}
          <Box sx={{ flex: 1 }} />
          <Button 
            onClick={handleResetSettings} 
            color="error"
            disabled={isTestingConnection}
          >
            Reset to Defaults
          </Button>
          <Button 
            onClick={handleSettingsClose} 
            color="primary"
            variant="contained"
            disabled={isTestingConnection}
          >
            Save & Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default App;
