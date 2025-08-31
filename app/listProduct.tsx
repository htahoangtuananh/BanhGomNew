import HeaderNav from '@/app/components/headerNav';
import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

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
    ava: {
        asset_src: string;
    };
    product_code: string;
}

interface InventoryLocation {
    id: string;
    name: string;
}

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;
const productImageSrc = 'https://huelinh.b-cdn.net/api/compress_image/';
const productFullImageSrc = 'https://huelinh.b-cdn.net/assets/img/product_images/';
export default function ListProductScreen() {

  const scrollViewRef = useRef<ScrollView>(null);
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
  const [openCategory, setOpenCategory] = useState(false);
  const [openBrand, setOpenBrand] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openCondition, setOpenCondition] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Đang tải dữ liệu...');
  const [openInventoryStatus, setOpenInventoryStatus] = useState(false);
  const [openInventoryLocation, setOpenInventoryLocation] = useState(false);
  const [selectedInventoryStatus, setSelectedInventoryStatus] = useState('2');
  const [selectedInventoryLocation, setSelectedInventoryLocation] = useState('-1');
  const [error, setError] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [imageSource, setImageSource] = useState('');
  
  useEffect(() => {
    const loadAuth = async () => {
      const store = await SecureStore.getItemAsync('store');
      const role = await SecureStore.getItemAsync('role');
      if (store && role != 'admin') {
        setSelectedInventoryLocation((parseInt(store)+1).toString());
      }else{
        setSelectedInventoryLocation('-1');
      }
    }
    loadAuth();
  }, []);

  const inventoryStatusOptions = [
    { label: 'Tất cả trạng thái', value: '-1' },

    { label: 'Còn hàng', value: '2' },
    { label: 'Hết hàng', value: '1' },
    { label: 'Kí gửi', value: '3' }
  ];

  const inventoryLocationOptions = [
    { label: 'Tất cả kho', value: '-1' },
    { label: 'Hà Nội', value: '1' },
    { label: 'Hồ Chí Minh', value: '2' }
  ];
  
  useEffect(() => {
    // Always reset to page 1 when any filter or search changes
    setPage(1);
    
    // Debounce the search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      handleSearch(1);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [selectedCategory, selectedBrand, selectedColor, selectedCondition, 
      selectedInventoryStatus, selectedInventoryLocation, search]);

  const handleSearch = async (pageNum = 1) => {
    try {
        // Scroll to top when changing pages
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        
        // Don't set loading for subsequent pages to avoid full screen loader
        if (pageNum === 1) {
            setIsLoading(true);
            setError(false); // Reset error state when starting new search
        }
        
        const params = new URLSearchParams({
            ...(selectedCategory && selectedCategory !== '-1' && { category_id: selectedCategory }),
            ...(selectedBrand && selectedBrand !== '-1' && { brand_id: selectedBrand }),
            ...(selectedColor && selectedColor !== '-1' && { color_id: selectedColor }),
            ...(selectedCondition && selectedCondition !== '-1' && { condition_id: selectedCondition }),
            ...(selectedInventoryStatus && selectedInventoryStatus !== '-1' && { inventoryStatus: selectedInventoryStatus }),
            ...(selectedInventoryLocation && selectedInventoryLocation !== '-1' && { inventory: selectedInventoryLocation }),
            ...(search && { search: search.trim() }),
            ...({ limit: '30'}),
            page: pageNum.toString(),
        });

        // Create an AbortController for the timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(
                `https://huelinh.com/api/get_list_product_api?${params}`,
                { signal: controller.signal }
            );
            clearTimeout(timeoutId);
            
            const data = await response.json();
            setIsLoading(false);
            setError(false);
            
            if (data.product && Array.isArray(data.product)) {
                setProductList(data.product);
                setTotalPage(data.maxPage);
            } else {
                setProductList([]);
            }
            setCategoryList(data.category);
            setBrandList(data.brand);
        } catch (err) {
            clearTimeout(timeoutId);
            throw err; // Re-throw to be caught by outer catch
        }
    } catch (error: any) {
        setIsLoading(false);
        setError(true);
        setMessage(error.name === 'AbortError' 
            ? 'Yêu cầu đã hết thời gian. Vui lòng thử lại.'
            : 'Đã xảy ra lỗi. Vui lòng thử lại.');
            
        setProductList([]);
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
  
  const loadMore = () => {
    if (page < totalPage) {
        const nextPage = page + 1;
        handleSearch(nextPage);
        setPage(nextPage);
        SecureStore.setItemAsync('page', nextPage.toString());
    }
  };

  const loadLess = () => {
    if (page > 1) {
        const prevPage = page - 1;
        handleSearch(prevPage);
        setPage(prevPage);
        SecureStore.setItemAsync('page', prevPage.toString());
    }
  };

  const LoadingOverlay = () => (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="#ffffff" />
      <Text style={styles.loadingText}>{message}</Text>
      {error && (
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => handleSearch()}
        >
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const handleRefresh = () => {
    setPage(1);
    handleSearch(1);
  };

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
        {isLoading && <LoadingOverlay />}
        {showImage && <ImageViewer/>}
        <View style={styles.container}>
          <HeaderNav currentScreen="Quản lý sản phẩm"/>
          <ScrollView style={styles.scrollContainer}>
              <View style={styles.listHeaderHolder}>
                  <View style={styles.searchWrapper}>
                      <TextInput 
                          style={styles.listHeaderSearch} 
                          placeholder="Tìm kiếm sản phẩm" 
                          placeholderTextColor="rgba(0, 0, 0, 0.5)"
                          value={search} 
                          onChangeText={setSearch} 
                          onSubmitEditing={() => {
                              setPage(1);
                              handleSearch(1);
                          }}
                      />
                  </View>
                  <TouchableOpacity 
                      style={styles.filterButton}
                      onPress={toggleFilter}
                      activeOpacity={0.6}
                  >
                      <LinearGradient
                          colors={showFilter ? ['#667eea', '#764ba2'] : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.filterButtonGradient}
                      >
                          <AntDesign name="filter" size={24} color={showFilter ? "#ffffff" : "#667eea"} />
                      </LinearGradient>
                  </TouchableOpacity>
              </View>
              {showFilter && (
                  <Animated.View style={[
                      styles.filterHolder,
                      {
                          opacity: slideAnim.interpolate({
                              inputRange: [-20, 0],
                              outputRange: [0, 1]
                          }),
                          transform: [{
                              translateY: slideAnim
                          }]
                      }
                  ]}>
                      <View style={styles.pickerRow}>
                          <View style={styles.pickerWrapper}>
                              <View style={styles.dropdownWrapper}>
                                  <DropDownPicker
                                      searchable={true}
                                      searchPlaceholder="Tìm kiếm danh mục..."
                                      open={openCategory}
                                      setOpen={setOpenCategory}
                                      value={selectedCategory}
                                      setValue={(callback) => setSelectedCategory(callback(''))}
                                      items={[
                                          { label: 'Tất cả danh mục', value: '-1' },
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
                                  />
                              </View>
                          </View>
                          <View style={styles.pickerWrapper}>
                              <View style={styles.dropdownWrapper}>
                                  <DropDownPicker
                                      searchable={true}
                                      searchPlaceholder="Tìm kiếm thương hiệu..."
                                      open={openBrand}
                                      setOpen={setOpenBrand}
                                      value={selectedBrand}
                                      setValue={(callback) => setSelectedBrand(callback(''))}
                                      items={[
                                          { label: 'Tất cả thương hiệu', value: '-1' },
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
                                  />
                              </View>
                          </View>
                          
                          <View style={styles.pickerWrapper}>
                              <View style={styles.dropdownWrapper}>
                                  <DropDownPicker
                                      searchable={true}
                                      searchPlaceholder="Tìm kiếm trạng thái..."
                                      open={openInventoryStatus}
                                      setOpen={setOpenInventoryStatus}
                                      value={selectedInventoryStatus}
                                      setValue={(callback) => setSelectedInventoryStatus(callback(''))}
                                      items={inventoryStatusOptions}
                                      placeholder="Trạng thái tồn kho"
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
                                  />
                              </View>
                          </View>
                          <View style={styles.pickerWrapper}>
                              <View style={styles.dropdownWrapper}>
                                  <DropDownPicker
                                      searchable={true}
                                      searchPlaceholder="Tìm kiếm kho..."
                                      open={openInventoryLocation}
                                      setOpen={setOpenInventoryLocation}
                                      value={selectedInventoryLocation}
                                      setValue={(callback) => setSelectedInventoryLocation(callback(''))}
                                      items={inventoryLocationOptions}
                                      placeholder="Kho hàng"
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
                                  />
                              </View>
                          </View>
                      </View>
                  </Animated.View>
              )}
              <View style={styles.listContent}>
                  <View style={styles.listContentHeader}>
                      <Text style={styles.listContentTitle}>Danh sách sản phẩm</Text>
                      <View style={styles.headerButtons}>
                          <TouchableOpacity 
                              style={styles.refreshButton} 
                              onPress={handleRefresh}
                          >
                              <LinearGradient
                                  colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.refreshButtonGradient}
                              >
                                  <AntDesign name="reload1" size={20} color="#667eea" />
                              </LinearGradient>
                          </TouchableOpacity>
                                                                                <TouchableOpacity style={styles.addButton} onPress={() => router.push('/addProduct')} >
                                <LinearGradient
                                    colors={['#06b6d4', '#0891b2']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.addButtonGradient}
                                >
                                    <AntDesign name="plus" size={20} color="white" />
                                </LinearGradient>
                            </TouchableOpacity>
                      </View>
                  </View>
                  {productList.length > 0 ? (
                      <View>
                          {productList.map((product) => (
                              <TouchableOpacity 
                                  onLongPress={() => openImage(product.ava?.asset_src)} 
                                  onPress={() => router.push(`/detailProduct/${product.product_id}`)} 
                                  key={product.product_id} 
                                  style={[
                                      styles.listContentItem,
                                      product.product_inventory_status == 0 && styles.soldOutItem
                                  ]}
                                  activeOpacity={0.7}
                              >
                                  <LinearGradient
                                      colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                      start={{ x: 0, y: 0 }}
                                      end={{ x: 1, y: 1 }}
                                      style={styles.productCardGradient}
                                  >
                                      <Image 
                                          source={{ 
                                              uri: product.ava?.asset_src 
                                                  ? productImageSrc + product.ava.asset_src 
                                                  : 'https://www.huelinh.com/assets/img/default-product.jpg'
                                          }} 
                                          style={styles.listContentItemImage} 
                                      />
                                      <View style={styles.listContentItemInfo}>
                                          <View style={styles.productNameContainer}>
                                              <Text style={styles.productName}>
                                                  {product.product_code} | {product.product_name}
                                              </Text>
                                              {product.product_inventory_status == 0 && (
                                                  <View style={styles.soldOutBadge}>
                                                      <Text style={styles.soldOutText}>Hết hàng</Text>
                                                  </View>
                                              )}
                                          </View>
                                          <Text style={styles.productBrand}>{product.brand_name}</Text>
                                          <Text style={styles.productPrice}>{Number(product.price_current).toLocaleString()}đ</Text>
                                          <Text style={styles.productId}>ID: {product.product_id}</Text>
                                      </View>
                                  </LinearGradient>
                              </TouchableOpacity>
                          ))}
                          {productList.length > 0 && (
                              <View style={styles.paginationContainer}>
                                  <TouchableOpacity 
                                      style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}
                                      onPress={() => {
                                          loadLess();
                                          SecureStore.setItemAsync('lastPage', page.toString());
                                      }}
                                      disabled={page === 1}
                                  >
                                      <LinearGradient
                                          colors={page === 1 ? ['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.3)'] : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                                          start={{ x: 0, y: 0 }}
                                          end={{ x: 1, y: 1 }}
                                          style={styles.paginationButtonGradient}
                                      >
                                          <AntDesign name="left" size={16} color={page === 1 ? "#999" : "#667eea"} />
                                      </LinearGradient>
                                  </TouchableOpacity>
                                  
                                  <View style={styles.pageNumbers}>
                                      {Array.from({ length: Math.min(5, totalPage) }, (_, i) => {
                                          let pageNum;
                                          if (totalPage <= 5) {
                                              pageNum = i + 1;
                                          } else if (page <= 3) {
                                              pageNum = i + 1;
                                          } else if (page >= totalPage - 2) {
                                              pageNum = totalPage - 4 + i;
                                          } else {
                                              pageNum = page - 2 + i;
                                          }
                                          
                                          return (
                                              <TouchableOpacity
                                                  key={pageNum}
                                                  style={[
                                                      styles.pageNumber,
                                                      page === pageNum && styles.pageNumberActive
                                                  ]}
                                                  onPress={() => {
                                                      handleSearch(pageNum);
                                                      setPage(pageNum);
                                                      SecureStore.setItemAsync('page', pageNum.toString());
                                                      SecureStore.setItemAsync('lastPage', pageNum.toString());
                                                  }}
                                              >
                                                  <LinearGradient
                                                      colors={page === pageNum ? ['#667eea', '#764ba2'] : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                                                      start={{ x: 0, y: 0 }}
                                                      end={{ x: 1, y: 1 }}
                                                      style={styles.pageNumberGradient}
                                                  >
                                                      <Text style={[
                                                          styles.pageNumberText,
                                                          page === pageNum && styles.pageNumberTextActive
                                                      ]}>
                                                          {pageNum}
                                                      </Text>
                                                  </LinearGradient>
                                              </TouchableOpacity>
                                          );
                                      })}
                                  </View>

                                  <TouchableOpacity 
                                      style={[styles.paginationButton, page === totalPage && styles.paginationButtonDisabled]}
                                      onPress={() => {
                                          loadMore();
                                          SecureStore.setItemAsync('lastPage', page.toString());
                                      }}
                                      disabled={page === totalPage}
                                  >
                                      <LinearGradient
                                          colors={page === totalPage ? ['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.3)'] : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                                          start={{ x: 0, y: 0 }}
                                          end={{ x: 1, y: 1 }}
                                          style={styles.paginationButtonGradient}
                                      >
                                          <AntDesign name="right" size={16} color={page === totalPage ? "#999" : "#667eea"} />
                                      </LinearGradient>
                                  </TouchableOpacity>
                              </View>
                          )}
                      </View>
                  ) : (
                      <View style={styles.emptyState}>
                          <LinearGradient
                              colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.emptyStateGradient}
                          >
                              <Text style={styles.emptyStateText}>Không tìm thấy sản phẩm nào</Text>
                          </LinearGradient>
                      </View>
                  )}
              </View>
          </ScrollView>
        </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  listHeaderSearch: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 15,
    fontSize: 16,
    color: '#374151',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  searchWrapper: {
    flex: 1,
    marginRight: 10,
  },
  listHeaderHolder: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 25,
    paddingBottom: 15,
  },
  filterButton: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  filterButtonGradient: {
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    minHeight: 50,
  },
  listContent: {
    flex: 1,
    flexDirection: 'column',
    gap: 15,
    padding: 25,
    paddingTop: 0,
    paddingBottom: 100,
  },
  listContentHeader: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  listContentTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  refreshButton: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  refreshButtonGradient: {
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    minHeight: 50,
  },
  addButton: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonGradient: {
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    minHeight: 50,
  },
  listContentItem: {
    borderRadius: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  productCardGradient: {
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContentItemImage: {
    width: 80,
    height: 80,
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
  listContentItemInfo: {
    marginLeft: 15,
    flex: 1,
  },
  productNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 5,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  productBrand: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  productPrice: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '700',
  },
  productId: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    fontWeight: '500',
  },
  filterHolder: {
    padding: 25,
    paddingTop: 0,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 5,
  },
  pickerWrapper: {
    flex: 1,
    minWidth: 150,
    zIndex: 1000,
  },
  dropdownWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  dropdownStyle: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    borderRadius: 12,
    minHeight: 50,
  },
  dropdownContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
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
    borderBottomColor: '#e5e7eb',
    padding: 8,
  },
  searchInput: {
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyStateGradient: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    width: '100%',
  },
  emptyStateText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  soldOutBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  soldOutText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  soldOutItem: {
    opacity: 0.6,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
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
  retryButton: {
    marginTop: 15,
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
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
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  paginationButton: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  paginationButtonGradient: {
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 45,
    minHeight: 45,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  pageNumbers: {
    flexDirection: 'row',
    gap: 8,
  },
  pageNumber: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  pageNumberGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  pageNumberActive: {
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pageNumberText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  pageNumberTextActive: {
    color: 'white',
    fontWeight: '700',
  },
});
