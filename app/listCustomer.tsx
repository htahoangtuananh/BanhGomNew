import HeaderNav from '@/app/components/headerNav';
import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

interface Customer {
    customer_id: number;
    customer_name: string;
    phone_number: string;
    other_info: string;
    type: string;
}

const screenHeight = Dimensions.get('window').height;

// Add customer type

export default function ListCustomerScreen() {
    const scrollViewRef = useRef<ScrollView>(null);
    const [search, setSearch] = useState('');
    const [customerList, setCustomerList] = useState<Customer[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        phone: '',
        otherInfo: '',
        type: ''
    });
    const [openCustomerType, setOpenCustomerType] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPage, setTotalPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const getCustomerList = async (pageNum = 1) => {
        try {
            setIsLoading(true);
            // Scroll to top when changing pages
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            
            const params = new URLSearchParams({
                ...(search && { search: search.trim() }),
                ...({ limit: '30'}),
                page: pageNum.toString(),
            });
            
            const response = await fetch(`https://huelinh.com/api/get_list_customer_api?${params}`);
            const data = await response.json();
            
            if (data && Array.isArray(data.customer)) {
                setCustomerList(data.customer);
                setTotalPage(data.maxPage || 1);
            } else {
                setCustomerList([]);
                setTotalPage(1);
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ!');
            setCustomerList([]);
            setTotalPage(1);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async (pageNum = 1) => {
        if (search.trim().length < 2 && search.trim().length > 0) {
            Alert.alert(
                'Thông báo',
                'Vui lòng nhập ít nhất 2 ký tự để tìm kiếm',
                [{ text: 'OK' }]
            );
            return;
        }

        try { 
            setIsLoading(true);
            // Scroll to top when changing pages
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            
            const params = new URLSearchParams({
                ...(search && { search: search.trim() }),
                ...({ limit: '30'}),
                page: pageNum.toString(),
            });
            const response = await fetch(`https://huelinh.com/api/get_list_customer_api?${params}`);
            const data = await response.json();
            
            if (data && Array.isArray(data.customer)) {
                setCustomerList(data.customer);
                setTotalPage(data.maxPage || 1);
            } else {
                setCustomerList([]);
                setTotalPage(1);
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ!');
            setCustomerList([]);
            setTotalPage(1);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        getCustomerList(1);
    }, []);

    useEffect(() => {
        // Reset to page 1 when search changes
        setPage(1);
        
        // Debounce the search to avoid too many API calls
        const timeoutId = setTimeout(() => {
            handleSearch(1);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [search]);

    const LoadingOverlay = ({ message }: { message: string }) => (
        <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>{message}</Text>
        </View>
    );

    const loadMore = () => {
        if (page < totalPage) {
            const nextPage = page + 1;
            handleSearch(nextPage);
            setPage(nextPage);
        }
    };

    const loadLess = () => {
        if (page > 1) {
            const prevPage = page - 1;
            handleSearch(prevPage);
            setPage(prevPage);
        }
    };

    const handleRefresh = () => {
        setPage(1);
        handleSearch(1);
    };

    const handleAddCustomer = async () => {
        if (!newCustomer.name && !newCustomer.phone) {
            return;
        }

        try {
            setIsCreatingCustomer(true);
            const formData = new FormData();
            formData.append('customer_name', newCustomer.name);
            formData.append('customer_phone', newCustomer.phone);
            formData.append('other_info', newCustomer.otherInfo);
            formData.append('type', newCustomer.type);
            formData.append('user_id', '1');

            const response = await fetch('https://huelinh.com/api/create_customer_api', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            if (data && typeof data === 'object' && data.status === 'success') {
                setModalVisible(false);
                setNewCustomer({ name: '', phone: '', otherInfo: '', type: '' });
                getCustomerList(); // Refresh the list
            } else {
                Alert.alert(
                    'Lỗi',
                    'Không thể tạo khách hàng. Vui lòng thử lại.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Error adding customer:', error);
            Alert.alert(
                'Lỗi',
                'Đã xảy ra lỗi khi tạo khách hàng. Vui lòng thử lại.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsCreatingCustomer(false);
        }
    };

    // Add this helper function to check if the form is valid
    const isFormValid = () => {
        return newCustomer.name.trim() !== '' || newCustomer.phone.trim() !== '';
    };

    return (
        <LinearGradient
            colors={['#667eea', '#764ba2', '#f093fb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <View style={styles.container}>
                <HeaderNav currentScreen="Quản lý khách hàng"/>
                {(isCreatingCustomer || isLoading) && (
                    <LoadingOverlay message={isCreatingCustomer ? "Đang tạo khách hàng mới..." : "Đang tải dữ liệu..."} />
                )}
                <View style={styles.listHeaderHolder}>
                    <View style={styles.searchWrapper}>
                        <TextInput 
                            style={styles.listHeaderSearch} 
                            placeholder="Tìm kiếm khách hàng" 
                            placeholderTextColor="rgba(0, 0, 0, 0.5)"
                            value={search} 
                            onChangeText={setSearch}
                            onSubmitEditing={() => {
                                handleSearch();
                            }}
                        />
                    </View>
                </View>
                <View style={styles.listContent}>
                    <View style={styles.listContentHeader}>
                        <Text style={styles.listContentTitle}>Danh sách khách hàng</Text>
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
                            <TouchableOpacity 
                                style={styles.addButton}
                                onPress={() => setModalVisible(true)}
                            >
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
                    <ScrollView ref={scrollViewRef} style={styles.customerList}>
                        {customerList && customerList.length > 0 ? (
                            customerList.map((customer) => (
                                <TouchableOpacity 
                                    key={customer.customer_id} 
                                    style={styles.listContentItem}
                                    onPress={() => router.push({
                                        pathname: "/detailCustomer/[id]",
                                        params: { id: customer.customer_id }
                                    })}
                                    activeOpacity={0.7}
                                >
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.customerCardGradient}
                                    >
                                        <View style={styles.listContentItemInfo}>
                                            <View style={styles.customerNameRow}>
                                                <Text style={styles.customerName}>{customer.customer_name}</Text>
                                                {customer.type == '0' && (
                                                    <Text style={styles.customerType0}>Mua</Text>
                                                )}
                                                {customer.type == '1' && (
                                                    <Text style={styles.customerType1}>Bán</Text>
                                                )}
                                                {customer.type == '2' && (
                                                    <Text style={styles.customerType2}>Mua & bán</Text>
                                                )}
                                            </View>
                                            <Text style={styles.customerContact}>SĐT: {customer.phone_number}</Text>
                                            <Text style={styles.customerInfoLabel}>Thông tin khác:</Text>
                                            <Text style={styles.customerContact}>{customer.other_info}</Text>
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <LinearGradient
                                    colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.emptyStateGradient}
                                >
                                    <Text style={styles.emptyStateText}>Không tìm thấy khách hàng nào</Text>
                                </LinearGradient>
                            </View>
                        )}
                    </ScrollView>
                    
                    {customerList.length > 0 && (
                        <View style={styles.paginationContainer}>
                            <TouchableOpacity 
                                style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}
                                onPress={loadLess}
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
                                onPress={loadMore}
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

                    <Modal
                        animationType="slide"
                        transparent={true}
                        visible={modalVisible}
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <LinearGradient
                            colors={['rgba(102, 126, 234, 0.9)', 'rgba(118, 75, 162, 0.9)', 'rgba(240, 147, 251, 0.9)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.modalContainer}
                        >
                            <KeyboardAvoidingView 
                                behavior={Platform.OS === "ios" ? "padding" : "height"}
                                style={{ flex: 1 }}
                            >
                                <TouchableOpacity 
                                    style={styles.modalOverlay} 
                                    activeOpacity={1} 
                                    onPress={() => setModalVisible(false)}
                                >
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.modalContent}
                                    >
                                        <ScrollView>
                                            <Text style={styles.modalTitle}>Thêm khách hàng mới</Text>
                                            
                                            <TextInput
                                                style={styles.modalInput}
                                                placeholder="Tên khách hàng"
                                                value={newCustomer.name}
                                                onChangeText={(text) => setNewCustomer({...newCustomer, name: text})}
                                            />
                                            
                                            <TextInput
                                                style={styles.modalInput}
                                                placeholder="Số điện thoại"
                                                value={newCustomer.phone}
                                                keyboardType="phone-pad"
                                                onChangeText={(text) => setNewCustomer({...newCustomer, phone: text})}
                                            />
                                            <View style={styles.inputGroup}>
                                                <Text style={styles.label}>Loại khách hàng</Text>
                                                <DropDownPicker
                                                    searchable={true}
                                                    searchPlaceholder="Tìm kiếm loại khách hàng..."
                                                    open={openCustomerType}
                                                    setOpen={setOpenCustomerType}
                                                    value={newCustomer.type || '0'}
                                                    setValue={(callback) => setNewCustomer({...newCustomer, type: callback('')})}
                                                    items={[
                                                    { label: 'Mua', value: '0' },
                                                    { label: 'Bán', value: '1' },
                                                    { label: 'Mua & bán', value: '2' },
                                                    ]}
                                                    placeholder="Chọn loại khách hàng"
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
                                            <TextInput
                                                style={[styles.modalInput, styles.modalTextArea]}
                                                placeholder="Thông tin khác"
                                                value={newCustomer.otherInfo}
                                                multiline={true}
                                                numberOfLines={4}
                                                onChangeText={(text) => setNewCustomer({...newCustomer, otherInfo: text})}
                                            />

                                            <View style={styles.modalButtons}>
                                                <TouchableOpacity 
                                                    style={styles.modalButtonCancel}
                                                    onPress={() => setModalVisible(false)}
                                                >
                                                    <LinearGradient
                                                        colors={['#6b7280', '#4b5563']}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 1 }}
                                                        style={styles.modalButtonGradient}
                                                    >
                                                        <Text style={styles.modalButtonText}>Hủy</Text>
                                                    </LinearGradient>
                                                </TouchableOpacity>
                                                
                                                <TouchableOpacity 
                                                    style={!isFormValid() ? styles.modalButtonDisabled : {}}
                                                    onPress={handleAddCustomer}
                                                    disabled={!isFormValid()}
                                                >
                                                    <LinearGradient
                                                        colors={!isFormValid() ? ['#cccccc', '#bbbbbb'] : ['#10b981', '#059669']}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 1 }}
                                                        style={styles.modalButtonGradient}
                                                    >
                                                        <Text style={styles.modalButtonText}>Thêm</Text>
                                                    </LinearGradient>
                                                </TouchableOpacity>
                                            </View>
                                        </ScrollView>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </KeyboardAvoidingView>
                        </LinearGradient>
                    </Modal>
                </View>
            </View>
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
    searchWrapper: {
        width: '100%',
    },
    listHeaderSearch: {
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
    listHeaderHolder: {
        padding: 25,
        paddingBottom: 15,
    },
    listContent: {
        flex: 1,
        padding: 25,
        paddingTop: 0,
        paddingBottom: 20,
    },
    listContentHeader: {
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
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    customerCardGradient: {
        padding: 20,
        borderRadius: 20,
    },
    listContentItemInfo: {
        flex: 1,
    },
    customerName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    customerContact: {
        fontSize: 15,
        color: '#6b7280',
        fontWeight: '500',
        marginBottom: 4,
    },
    customerInfoLabel: {
        fontSize: 15,
        color: '#6b7280',
        fontWeight: '500',
        marginBottom: 4,
        marginTop: 8,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
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
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'transparent',
    },
    modalContent: {
        borderRadius: 20,
        padding: 25,
        width: '90%',
        maxWidth: 400,
        maxHeight: '70%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 20,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    modalInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        fontSize: 16,
        color: '#374151',
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    modalTextArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
        marginTop: 10,
    },
    modalButtonCancel: {
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
    modalButtonGradient: {
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        minWidth: 120,
    },
    modalButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    modalButtonDisabled: {
        opacity: 0.6,
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
    loadingText: {
        marginTop: 16,
        fontSize: 18,
        color: '#ffffff',
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    customerList: {
        flex: 1,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        fontWeight: '600',
        color: '#374151',
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        fontSize: 16,
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
    pickerContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    picker: {
        height: 50,
        width: '100%',
    },
    submitButton: {
        borderRadius: 16,
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    dropdownStyle: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 1,
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
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonTextDisabled: {
        color: '#666666',
    },
      customerType0: {
        color: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        fontSize: 12,
        fontWeight: '600',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      },
      customerType1: {
        color: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        fontSize: 12,
        fontWeight: '600',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      },
      customerType2: {
        color: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        fontSize: 12,
        fontWeight: '600',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      },
      customerNameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
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
