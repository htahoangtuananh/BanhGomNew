import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, TextInput, Platform, Modal, ActivityIndicator, Alert } from 'react-native';
import HeaderNav from '@/app/components/headerNav';
import { useState, useEffect, useRef } from 'react';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import DropDownPicker from 'react-native-dropdown-picker';
import { SetStateAction as SetStateValue } from 'react';
import { Dimensions } from 'react-native';
import { router } from 'expo-router';

const screenHeight = Dimensions.get('window').height;
// Keep the helper functions
const formatPrice = (price: string) => {
  if (!price) return '';
  return Number(price).toLocaleString('de-DE');
};

const unformatPrice = (price: string) => {
  if (!price) return '';
  return price.replace(/\./g, '');
};

interface DropdownState {
  [key: number]: boolean;
}

interface Product {
    product_id: number;
    product_name: string;
    product_inventory_status: number;
    brand_name: string;
    price_current: number;
    ava: {
        asset_src: string;
    };
}

const productImageSrc = 'https://huelinh.b-cdn.net/assets/img/product_images/';

// Add a timeout wrapper function
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 30000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

interface ProductSet {
  id: string;
  productId: string;
  amount: string;
  price: string;
  displayPrice: string;
}

export default function AddInventoryImportScreen() {
  const [productSets, setProductSets] = useState<ProductSet[]>([
    { id: '1', productId: '', amount: '', price: '', displayPrice: '' }
  ]);
  const [productList, setProductList] = useState<Product[]>([]);
  const [openDropdowns, setOpenDropdowns] = useState<{[key: string]: boolean}>({});
  const [isCreatingInventoryImport, setIsCreatingInventoryImport] = useState(false);

  const addNewSet = () => {
    // Check if all existing sets are complete
    const allSetsComplete = productSets.every(set => set.productId && set.amount);
    
    if (!allSetsComplete) {
      Alert.alert('Error', 'Please fill in all fields before adding a new set');
      return;
    }

    setProductSets([...productSets, { id: String(productSets.length + 1), productId: '', amount: '', price: '', displayPrice: '' }]);
    setOpenDropdowns({ ...openDropdowns, [productSets.length]: false });
  };

  const removeSet = (id: string) => {
    if (productSets.length > 1) {
      setProductSets(productSets.filter(set => set.id !== id));
    }
  };

  const handleSearch = async () => {
    try { 
        const response = await fetch(`https://huelinh.com/api/get_list_product_api`);
        const data = await response.json();
        
        // Handle empty or null response
        if (data.product && Array.isArray(data.product)) {
            setProductList(data.product);
        } else {
            setProductList([]); // Set empty array if no results
        }
    } catch (error) {
        Alert.alert('Error', 'Không thể kết nối đến máy chủ!');
        setProductList([]); // Set empty array on error
    }
  };

  const updateProductSet = (index: number, field: 'productId' | 'amount' | 'price' | 'displayPrice', value: string) => {
    setProductSets(productSets.map((set, i) => {
      if (i === index) {
        // If updating productId, also set amount to "1"
        if (field === 'productId') {
          return { ...set, productId: value, amount: "1", price: "0", displayPrice: "0" };
        }
        // Otherwise just update the specified field
        return { ...set, [field]: value };
      }
      return set;
    }));
  };

  const scrollViewRef = useRef<ScrollView>(null);

  const handleSubmit = async () => {
    // Validate that all sets have both product and amount
    const isValid = productSets.every(set => set.productId && set.amount);
    
    if (!isValid) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    try {
      // Scroll to top first
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });

      // Small delay to ensure smooth scrolling before showing overlay
      await new Promise(resolve => setTimeout(resolve, 100));

      setIsCreatingInventoryImport(true);
      const formData = new FormData();
      
      formData.append('userId', '1');
      formData.append('productSets', JSON.stringify(productSets));

      console.log('FormData:', formData);
      
      const response = await fetchWithTimeout(
        'https://huelinh.com/api/create_inventory_import',
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
        60000 // 30 second timeout
      );

      const data = await response.json();
      Alert.alert(
        'Thành công',
        'Tạo nhập kho đã được tạo thành công',
        [
          {
            text: 'OK',
            onPress: () => {
              // Redirect to listProduct screen
              router.push('/listInventory');
            }
          }
        ]
      );
    } catch (error) {
      setIsCreatingInventoryImport(false);
      
      Alert.alert(
        'Lỗi',
        error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    }
  };

  useEffect(() => {
    handleSearch();
  }, []);
  console.log(productSets);
  const LoadingOverlay = ({ message }: { message: string }) => (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
  // Add this function to check if form is valid
  const isFormValid = () => {
    return productSets.every(set => set.productId && set.amount);
  };

  return (
    <ScrollView style={styles.container} ref={scrollViewRef}>
      <HeaderNav currentScreen="Tạo nhập kho"/>
      {isCreatingInventoryImport && (
        <LoadingOverlay message="Đang tạo nhập kho mới..." />
      )}
      <View style={styles.formContainer}>
        {productSets.map((set, index) => (
        <View key={set.id} style={styles.productSetContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.setTitle}>Set {index + 1}</Text>
            {productSets.length > 1 && (
              <TouchableOpacity 
                onPress={() => removeSet(set.id)}
                style={styles.removeButton}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product</Text>
            <DropDownPicker
              searchable={true}
              searchPlaceholder="Tìm kiếm sản phẩm..."
              open={openDropdowns[set.id] || false}
              setOpen={(value: SetStateValue<boolean>) => 
                setOpenDropdowns({ ...openDropdowns, [set.id]: value as boolean })
              }
              value={set.productId}
              setValue={(callback) => {
                const newValue = callback(set.productId);
                updateProductSet(index, 'productId', newValue);
              }}
              items={productList
                .filter(product => 
                  !productSets.some((set, i) => 
                    i !== index && set.productId === product.product_id.toString()
                  )
                )
                .map(product => ({
                  label: product.product_name,
                  value: product.product_id.toString(),
                  icon: () => (
                    <Image 
                      source={{ uri: productImageSrc + product.ava.asset_src }} 
                      style={styles.dropdownItemImage}
                    />
                  )
                }))}
              placeholder="Chọn sản phẩm"
              style={styles.dropdownStyle}
              dropDownContainerStyle={styles.dropdownContainer}
              searchContainerStyle={styles.searchContainer}
              searchTextInputStyle={styles.searchInput}
              listMode="MODAL"
              modalProps={{
                animationType: "fade"
              }}
              modalContentContainerStyle={{
                backgroundColor: "white"
              }}
              selectedItemContainerStyle={{
                backgroundColor: '#e6f3ff'
              }}
              selectedItemLabelStyle={{
                color: '#0066cc',
                fontWeight: 'bold'
              }}
              tickIconStyle={{
                tintColor: '#0066cc'
              } as any}
              listItemContainerStyle={{
                borderBottomWidth: 1,
                borderBottomColor: '#ddd',
                flexDirection: 'row',
                alignItems: 'center',
                height: 60
              }}

            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số lượng</Text>
            <TextInput
              style={styles.input}
              value={set.amount}
              onChangeText={(value) => updateProductSet(index, 'amount', value)}
              keyboardType="numeric"
              placeholder="Nhập số lượng"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số tiền bán</Text>
            <TextInput
              style={styles.input}
              value={set.displayPrice}
              onChangeText={(text) => {
                const unformatted = unformatPrice(text);
                setProductSets(prevSets => {
                  const newSets = prevSets.map((s, i) => {
                    if (i === index) {
                      return {
                        ...s,
                        price: unformatted,
                        displayPrice: formatPrice(unformatted)
                      };
                    }
                    return s;
                  });
                  
                  return newSets;
                });
              }}
              keyboardType="numeric"
              placeholder="Nhập số tiền"
            />
          </View>
        </View>
      ))}

      <TouchableOpacity 
        style={[
          styles.addButton,
          !productSets.every(set => set.productId && set.amount) && styles.addButtonDisabled
        ]}
        disabled={!productSets.every(set => set.productId && set.amount)}
        onPress={addNewSet}
      >
        <Text style={styles.addButtonText}>+ Thêm sản phẩm</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[
          styles.submitButton,
          !isFormValid() && styles.submitButtonDisabled
        ]}
        disabled={!isFormValid()}
        onPress={handleSubmit}
      >
        <Text style={styles.submitButtonText}>Submit</Text>
      </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(244, 246, 249)',
  },
  formContainer: {
    padding: 16,
  },
  productSetContainer: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  setTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  removeButton: {
    backgroundColor: '#ff4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  dropdownStyle: {
    backgroundColor: 'white',
    borderColor: '#DDD',
    borderWidth: 1,
    borderRadius: 8,
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderColor: '#DDD',
    borderWidth: 1,
  },
  searchContainer: {
    borderBottomColor: '#DDD',
    padding: 8,
  },
  searchInput: {
    borderColor: '#DDD',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
    maxWidth: 200,
    marginLeft: 'auto',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#28A745',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownItemImage: {
    width: 40,
    height: 40,
    marginRight: 10,
    borderRadius: 4,
  },
  dropdownItem: {
    padding: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  submitButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    height: screenHeight,
  },
  addButtonDisabled: {
    backgroundColor: '#cccccc',
  },
});