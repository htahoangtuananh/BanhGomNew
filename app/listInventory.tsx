import HeaderNav from '@/app/components/headerNav';
import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

const screenHeight = Dimensions.get('window').height;

interface Category {
    product_category_id: number;
    category_name: string;
}

interface Brand {
    brand_id: number;
    brand_name: string;
}

interface FilterValue {
    category_filter_value_id: number;
    category_filter_value: string;
}

interface Product {
    product_id: number;
    product_name: string;
    product_inventory_status: number;
    brand_name: string;
    price_current: number;
    created_at: string;
    ie_date: string;
    ava: {
        asset_src: string;
    };
    product_code: string;
}

interface OrderGroup {
    date: string;
    orderList: Product[];
}

const screenWidth = Dimensions.get("window").width;
const productImageSrc = 'https://huelinh.b-cdn.net/api/compress_image/';
const productFullImageSrc = 'https://huelinh.b-cdn.net/assets/img/product_images/';
export default function ListInventoryScreen() {

  const [search, setSearch] = useState('');
  const [productList, setProductList] = useState<Product[]>([]);
  const [brandList, setBrandList] = useState<Brand[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [filterColorList, setFilterColorList] = useState<FilterValue[]>([]);
  const [filterConditionList, setFilterConditionList] = useState<FilterValue[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [slideAnim] = useState(new Animated.Value(-20));
  const [selectedInventoryType, setSelectedInventoryType] = useState('import');
  const [openCategory, setOpenCategory] = useState(false);
  const [openBrand, setOpenBrand] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openCondition, setOpenCondition] = useState(false);
  const [productListByDate, setProductListByDate] = useState<OrderGroup[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [openProductSelect, setOpenProductSelect] = useState(false);
  const [showTimeoutOverlay, setShowTimeoutOverlay] = useState(false);
  const TIMEOUT_DURATION = 30000; // 30 seconds
  const [store, setStore] = useState('0');
  const [storeOpen, setStoreOpen] = useState(false);
  const [role, setRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [storeList, setStoreList] = useState([
    { label: 'Hà Nội', value: '1' },
    { label: 'Hồ Chí Minh', value: '2' },
  ]);
  const [storeLoaded, setStoreLoaded] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [imageSource, setImageSource] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const loadAuth = async () => {
      const storeId = await SecureStore.getItemAsync('store');
      const role = await SecureStore.getItemAsync('role');
      if (storeId) {
        setStore((parseInt(storeId)+1).toString());
      }
      setRole(role || '0');
      setStoreLoaded(true);
    };
    loadAuth();
  }, []);

  const getProductList = async () => {
    try {
      const params = new URLSearchParams({
          ...({ inventory: store }),
      });
      const response = await handleRequestWithTimeout(
        fetch(`https://huelinh.com/api/get_list_product_api?${params}`)
      );
      const data = await response.json();
      setProductList(data.product);
      setBrandList(data.brand);
      setCategoryList(data.category);
      setFilterColorList(data.filterColor);
      setFilterConditionList(data.filterCondition);
      
    } catch (error) {
      console.error('Failed to fetch product list:', error);
    }
  };
  const getInventoryList = async () => {
    try {
      setIsLoading(true);
      setError(false); // Reset error state
      
      const params = new URLSearchParams();
      if (selectedInventoryType) {
          params.append('ie_type', selectedInventoryType);
      }
      if (selectedProduct) {
          params.append('product_id', selectedProduct);
      }
      if (selectedCategory) {
          params.append('category_id', selectedCategory);
      }
      if (selectedBrand) {
          params.append('brand_id', selectedBrand);
      }
      if (selectedColor) {
          params.append('color_id', selectedColor);
      }
      if (selectedCondition) {
          params.append('condition_id', selectedCondition);
      }
      if (store) {
        params.append('inventory', store);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 10 second timeout

      try {
        const response = await fetch(
          `https://huelinh.com/api/get_inventory_ie?${params}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        const data = await response.json();
        setProductListByDate(groupProductsByDate(data));
        setIsLoading(false);
        setError(false);
      } catch (err) {
        clearTimeout(timeoutId);
        throw err; // Re-throw to be caught by outer catch
      }
    } catch (error: any) {
      setError(true);
      setIsLoading(false);
      Alert.alert(
        'Lỗi',
        error.name === 'AbortError'
          ? 'Yêu cầu đã hết thời gian. Vui lòng thử lại.'
          : 'Không thể kết nối đến máy chủ'
      );
      setProductListByDate([]);
    }
  };
  
  useEffect(() => {
    if (storeLoaded) {
      getInventoryList();
    }
  }, [
    selectedInventoryType,
    selectedProduct,
    selectedCategory,
    selectedBrand, 
    selectedColor,
    selectedCondition,
    store,
    storeLoaded
  ]);
  const groupProductsByDate = (products: Product[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const grouped = products.reduce((acc: { [key: string]: Product[] }, product) => {
        const productDate = new Date(product.ie_date);
        productDate.setHours(0, 0, 0, 0);
        
        let dateKey: string;
        if (productDate.getTime() === today.getTime()) {
            dateKey = 'Hôm nay';
        } else if (productDate.getTime() === yesterday.getTime()) {
            dateKey = 'Hôm qua';
        } else {
            dateKey = new Date(product.ie_date).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        }
        
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(product);
        return acc;
    }, {});

    // Custom sort function to ensure "Hôm nay" and "Hôm qua" appear first
    return Object.entries(grouped)
        .map(([date, orderList]) => ({
            date,
            orderList
        }))
        .sort((a, b) => {
            if (a.date === 'Hôm nay') return -1;
            if (b.date === 'Hôm nay') return 1;
            if (a.date === 'Hôm qua') return -1;
            if (b.date === 'Hôm qua') return 1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
  };
  const handleSearch = async () => {
    try {
        setIsLoading(true);
        setError(false); // Reset error state
        
        const params = new URLSearchParams({
            ...(selectedCategory && { category_id: selectedCategory }),
            ...(selectedBrand && { brand_id: selectedBrand }),
            ...(selectedColor && { color_id: selectedColor }),
            ...(selectedCondition && { condition_id: selectedCondition }),
            ...(search && { search: search.trim() })
        });

        // Create an AbortController for the timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            const response = await fetch(
                `https://huelinh.com/api/get_list_product_api?${params}`,
                { signal: controller.signal }
            );
            clearTimeout(timeoutId);
            
            const data = await response.json();
            
            if (data.product && Array.isArray(data.product)) {
                setProductList(data.product);
            } else {
                setProductList([]);
            }
            setIsLoading(false);
            setError(false);
        } catch (err) {
            clearTimeout(timeoutId);
            throw err; // Re-throw to be caught by outer catch
        }
    } catch (error: any) {
        setError(true);
        setIsLoading(false);
        Alert.alert(
            'Lỗi',
            error.name === 'AbortError'
                ? 'Yêu cầu đã hết thời gian. Vui lòng thử lại.'
                : 'Không thể kết nối đến máy chủ'
        );
        setProductList([]);
        setProductListByDate([]);
    }
  };
  const toggleFilter = () => {
    if (showFilter) {
        // Slide up animation
        Animated.sequence([
            Animated.timing(slideAnim, {
                toValue: -20,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start(() => {
            setShowFilter(false);
        });
    } else {
        // Slide down animation
        setShowFilter(true);
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }
  };
  useEffect(() => {
    Animated.timing(slideAnim, {
        toValue: showFilter ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
    }).start();
  }, [showFilter]);
  
  useEffect(() => {
    handleSearch();
  }, [selectedCategory, selectedBrand, selectedColor, selectedCondition, search]);

  const handleRequestWithTimeout = async (requestPromise: Promise<any>) => {
    try {

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), TIMEOUT_DURATION);
      });

      const response = await Promise.race([requestPromise, timeoutPromise]);
      setShowTimeoutOverlay(false);
      return response;
    } catch (error) {
      setShowTimeoutOverlay(true);
      throw error;
    }
  };

  const handleRetry = () => {
    setShowTimeoutOverlay(false);
    getInventoryList();
  };

  const handleRefresh = () => {
    setShowTimeoutOverlay(false);
    // Reset all filters
    setSelectedProduct('-1');
    setSelectedCategory('-1');
    setSelectedBrand('-1');
    setSelectedColor('-1');
    setSelectedCondition('-1');
    // Refresh all data
    getProductList();
    getInventoryList();
  };

  const handleStoreChange = (value: string) => {
    setStore(value);
  };

  useEffect(() => {
    if (storeLoaded) {
      getProductList();
    }
  }, [store, storeLoaded]);

  const TimeoutOverlay = () => (
    <View style={styles.timeoutOverlay}>

      <View style={styles.timeoutContent}>
        <Text style={styles.timeoutText}>Không thể kết nối đến máy chủ</Text>
        <View style={styles.timeoutButtons}>
          <TouchableOpacity 
            style={styles.timeoutButton}
            onPress={handleRetry}
          >
            <AntDesign name="reload1" size={20} color="white" />
            <Text style={styles.timeoutButtonText}>Thử lại</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.timeoutButton, styles.refreshButton]}
            onPress={handleRefresh}
          >
            <AntDesign name="sync" size={20} color="white" />
            <Text style={styles.timeoutButtonText}>Làm mới</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const LoadingOverlay = () => (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      {error && (
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => handleRefresh()}
        >
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const openImage = (imageSource: string) => {
    setShowImage(true);
    setImageSource(imageSource);
  };

  const ImageViewer = () => (
    <TouchableOpacity 
      style={styles.imageViewerOverlay} 
      activeOpacity={1}
      onPress={() => setShowImage(false)}
    >
      <View style={styles.imageViewer}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => setShowImage(false)}
        >
          <AntDesign name="close" size={24} color="white" />
        </TouchableOpacity>
        <Image 
          source={{ uri: productFullImageSrc + imageSource }} 
          style={styles.fullScreenImage}
          resizeMode="contain"
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
        {(!storeLoaded || isLoading) && <LoadingOverlay />}
        {showImage && <ImageViewer />}
        <HeaderNav currentScreen="Quản lý xuất nhập kho"/>
        {role == 'admin' && (
        <View style={styles.storePickerContainer}>
            <DropDownPicker
                open={storeOpen}
                value={store}
                items={storeList}
                setOpen={setStoreOpen}
                setValue={(callback: any) => handleStoreChange(callback(store))}
                setItems={setStoreList}
                placeholder="Chọn cửa hàng"
                style={styles.dropdownStyle}
                dropDownContainerStyle={styles.dropdownContainer}
                listMode="SCROLLVIEW"
                scrollViewProps={{
                    nestedScrollEnabled: true,
                }}
            />
        </View>
        )}
        <View style={styles.listHeaderHolder}>
            <TouchableOpacity 
                onPress={() => setSelectedInventoryType('import')} 
                activeOpacity={0.6}
            >
                <LinearGradient
                    colors={selectedInventoryType === 'import' ? ['#10b981', '#059669'] : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.listHeaderButtonSelect,
                        selectedInventoryType === 'import' && styles.selectedButton
                    ]}
                >
                    <Text style={[
                        styles.listHeaderButtonText,
                        selectedInventoryType === 'import' && styles.selectedButtonText
                    ]}>Nhập kho</Text>
                </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
                onPress={() => setSelectedInventoryType('export')} 
                activeOpacity={0.6}
            >
                <LinearGradient
                    colors={selectedInventoryType === 'export' ? ['#10b981', '#059669'] : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.listHeaderButtonSelect,
                        selectedInventoryType === 'export' && styles.selectedButton
                    ]}
                >
                    <Text style={[
                        styles.listHeaderButtonText,
                        selectedInventoryType === 'export' && styles.selectedButtonText
                    ]}>Xuất kho</Text>
                </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
                onPress={toggleFilter}
                activeOpacity={0.6}
            >
                <LinearGradient
                    colors={showFilter ? ['#667eea', '#764ba2'] : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.listHeaderButton}
                >
                    <AntDesign name="filter" size={24} color={showFilter ? "#ffffff" : "#667eea"} />
                </LinearGradient>
            </TouchableOpacity>
        </View>
        {showFilter && (
            <Animated.View style={[styles.filterHolder, {
                opacity: slideAnim.interpolate({
                    inputRange: [-20, 0],
                    outputRange: [0, 1]
                }),
                transform: [{
                    translateY: slideAnim
                }]
            }]}>
                <View style={styles.pickerRow}>
                    <View style={styles.productPickerWrapper}>
                        <DropDownPicker
                            searchable={true}
                            searchPlaceholder="Tìm kiếm sản phẩm..."
                            open={openProductSelect}
                            setOpen={setOpenProductSelect}
                            value={selectedProduct}
                            setValue={(callback) => {
                                const newValue = callback('');
                                setSelectedProduct(newValue);
                                // Reset other filters when a product is selected
                                if (newValue && newValue !== "-1") {
                                    setSelectedCategory("-1");
                                    setSelectedBrand("-1");
                                    setSelectedColor("-1");
                                    setSelectedCondition("-1");
                                }
                            }}
                            items={[
                                { 
                                    label: "Tất cả sản phẩm", 
                                    value: "-1",
                                    icon: () => <View></View>
                                },
                                ...productList.map((product) => ({
                                    label: product.product_code + ' | ' + product.product_name,
                                    value: product.product_id.toString(),
                                    icon: () => (
                                        <Image 
                                            source={{ uri: productImageSrc + product.ava.asset_src }} 
                                            style={styles.dropdownItemImage}
                                        />
                                    )
                                }))
                            ]}
                            placeholder="Chọn sản phẩm"
                            style={[styles.dropdownStyle, styles.productDropdownStyle]}
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
                                height: 80
                            }}
                        />
                    </View>
                    {(!selectedProduct || selectedProduct === "-1") && (
                        <View style={styles.otherPickersRow}>
                            <View style={styles.pickerWrapper}>
                                <DropDownPicker
                                    searchable={true}
                                    searchPlaceholder="Tìm kiếm danh mục..."
                                    open={openCategory}
                                    setOpen={setOpenCategory}
                                    value={selectedCategory}
                                    setValue={(callback) => setSelectedCategory(callback(''))}
                                    items={[
                                        { label: "Tất cả danh mục", value: "-1" },
                                        ...categoryList.map((category) => ({
                                            label: category.category_name,
                                            value: category.product_category_id.toString()
                                        }))
                                    ]}
                                    placeholder="Tất cả danh mục"
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
                                />
                            </View>
                            <View style={styles.pickerWrapper}>
                                <DropDownPicker
                                    searchable={true}
                                    searchPlaceholder="Tìm kiếm thương hiệu..."
                                    open={openBrand}
                                    setOpen={setOpenBrand}
                                    value={selectedBrand}
                                    setValue={(callback) => setSelectedBrand(callback(''))}
                                    items={[
                                        { label: "Tất cả thương hiệu", value: "-1" },
                                        ...brandList.map((brand) => ({
                                            label: brand.brand_name,
                                            value: brand.brand_id.toString()
                                        }))
                                    ]}
                                    placeholder="Tất cả thương hiệu"
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
                                />
                            </View>
                            <View style={styles.pickerWrapper}>
                                <DropDownPicker
                                    searchable={true}
                                    searchPlaceholder="Tìm kiếm màu sắc..."
                                    open={openColor}
                                    setOpen={setOpenColor}
                                    value={selectedColor}
                                    setValue={(callback) => setSelectedColor(callback(''))}
                                    items={[
                                        { label: "Tất cả màu sắc", value: "-1" },
                                        ...filterColorList.map((color) => ({
                                            label: color.category_filter_value,
                                            value: color.category_filter_value_id.toString()
                                        }))
                                    ]}
                                    placeholder="Tất cả màu sắc"
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
                                />
                            </View>
                            <View style={styles.pickerWrapper}>
                                <DropDownPicker
                                    searchable={true}
                                    searchPlaceholder="Tìm kiếm trạng thái..."
                                    open={openCondition}
                                    setOpen={setOpenCondition}
                                    value={selectedCondition}
                                    setValue={(callback) => setSelectedCondition(callback(''))}
                                    items={[
                                        { label: "Tất cả trạng thái", value: "-1" },
                                        ...filterConditionList.map((condition) => ({
                                            label: condition.category_filter_value,
                                            value: condition.category_filter_value_id.toString()
                                        }))
                                    ]}
                                    placeholder="Tất cả trạng thái"
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
                                />
                            </View>
                        </View>
                    )}
                </View>
            </Animated.View>
        )}
        <View style={styles.listContent}>
            <View style={styles.listContentHeader}>
                <Text style={styles.listContentTitle}>Danh sách {selectedInventoryType}</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity 
                        onPress={handleRefresh}
                    >
                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.refreshButton}
                        >
                            <AntDesign name="reload1" size={20} color="#667eea" />
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => {
                            if(selectedInventoryType == 'import') {
                                router.push(`/addProduct`)
                            } else {
                                router.push(`/addInventoryExport`)
                            }
                        }} 
                    >
                        <LinearGradient
                            colors={['#06b6d4', '#0891b2']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.listContentButton}
                        >
                            <AntDesign name="plus" size={20} color="white" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
            <ScrollView style={styles.scrollableContent}>
            {productListByDate.length > 0 ? (
                
                productListByDate.map((group, index) => (
                    <View key={index + Math.random()} style={styles.dateGroup}>
                        <Text style={styles.dateHeader}>{group.date}</Text>
                        {group.orderList.map((product) => (
                            <TouchableOpacity 
                                key={product.product_id+Math.random()}
                                onPress={() => router.push(`/detailProduct/${product.product_id}`)} 
                                onLongPress={() => openImage(product.ava.asset_src)}
                            >
                                <LinearGradient
                                    colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.listContentItem}
                                >
                                <Image 
                                    source={{ uri: productImageSrc + product.ava.asset_src }} 
                                    style={styles.listContentItemImage} 
                                />
                                <View style={styles.listContentItemInfo}>
                                    <Text style={[
                                        styles.productName
                                    ]}>
                                        {product.product_code} | {product.product_name}
                                    </Text>
                                    <Text style={styles.productBrand}>{product.brand_name}</Text>
                                    <Text style={styles.productPrice}>
                                        {Number(product.price_current).toLocaleString()}đ
                                    </Text>
                                </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        ))}
                    </View>
                ))
            ) : (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>Không tìm thấy đơn nhập nào</Text>
                </View>
            )}
            </ScrollView>
        </View>
        {showTimeoutOverlay && <TimeoutOverlay />}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgb(222, 224, 228)',
  },
  icon: {
    width: 24,
    height: 24,
  },
  listHeaderSearch: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(222, 224, 228, 0.5)',
    backgroundColor: 'white',
    padding: 15,
  },
  listHeaderHolder: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 10,
    padding: 25,
    paddingBottom: 15
  },
  listHeaderButtonHolder: {
    flexDirection: 'row',
    gap: 5,
  },
  listHeaderButtonSelect: {
    padding: 10,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listHeaderButton: {
    padding: 10,
    borderRadius: 12,
    marginLeft: 'auto',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedButton: {
    borderRadius: 12,
  },
  listHeaderButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  selectedButtonText: {
    color: 'white',
  },
  listContent: {
    flex: 1,
    flexDirection: 'column',
    padding: 25,
    paddingTop: 10,
    marginTop: 0
  },
  listContentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  listContentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  listContentButton: {
    padding: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listContentItem: {
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  listContentItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  listContentItemInfo: {
    marginLeft: 15,
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
    fontFamily: 'Roboto_400Regular',
  },
  productBrand: {
    fontSize: 15,
    color: 'rgba(0, 0, 0, 0.5)',
    fontFamily: 'Roboto_400Regular',
  },
  productPrice: {
    fontSize: 14,
    color: '#28A745',
    fontFamily: 'Roboto_400Regular',
  },
  filterHolder: {
    padding: 25,
    paddingTop: 0,
    paddingBottom: 10
  },
  pickerRow: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 5,
    zIndex: 1000,
  },
  productPickerWrapper: {
    width: '100%',
    marginBottom: 8,
    zIndex: 1000,
  },
  otherPickersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    zIndex: 999,
  },
  pickerWrapper: {
    flex: 1,
    minWidth: '48%',
    marginBottom: 8,
    zIndex: 998,
  },
  dropdownStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 45,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
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
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Roboto_400Regular',
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
    color: '#374151',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItemImage: {
    width: 60,
    height: 60,
    marginRight: 10,
    borderRadius: 4,
  },
  productDropdownStyle: {
    minHeight: 60,
  },
  scrollableContent: {
    flex: 1,
  },
  timeoutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  timeoutContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  timeoutText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  timeoutButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  timeoutButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  storePickerContainer: {
    padding: 25,
    paddingBottom: 0,
    zIndex: 1000, // Required for DropDownPicker
  },
  retryButton: {
    marginTop: 15,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto_400Regular',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    height: screenHeight,
  },
  imageViewerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 9999,
  },
  imageViewer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 10,
    zIndex: 10000,
    padding: 10,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});
