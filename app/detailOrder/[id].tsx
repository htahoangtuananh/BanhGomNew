import HeaderNav from '@/app/components/headerNav';
import { AntDesign } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
const screenWidth = Dimensions.get("window").width;
const productImageSrc = 'https://huelinh.b-cdn.net/assets/img/product_images/';

interface Product {
    product_id: number;
    product_name: string;
    product_inventory_status: number;
    brand_name: string;
    price_current: number;
    ie_date: string;
    ava: {
        asset_src: string;
    };
    order_id: string;
    status: string;
    customer_name: string;
    phone_number: string;
    note: string;
    total_price: number;
    other_info: string;
    fullname: string;
    username: string;
    order_price: string;
    order_quantity: string;
    discount: string;
    seller: string;
    history?: {
        payment_id: string;
        notification_body: string;
        created_date: string;
        payment_method: string;
        note: string;
    }[];
    paid_amount: string;
}

const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(',', '');
};

const formatPrice = (price: string) => {
    if(price === '0'){
        return '0';
    }
    return Number(price).toLocaleString('de-DE');
}

const unformatPrice = (price: string) => {
    if (!price) return '';
    return price.replace(/\./g, '');
};

export default function DetailOrderScreen() {
    const { id } = useLocalSearchParams();
    const [orderDetails, setOrderDetails] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [openStatus, setOpenStatus] = useState(false);
    const [editStatus, setEditStatus] = useState('');
    const [editNote, setEditNote] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [userId, setUserId] = useState('0');
    const [role, setRole] = useState('0');
    const [editPaid, setEditPaid] = useState('0');
    const [editDisplayPaid, setEditDisplayPaid] = useState('0');

    const orderStatuses = [
        { id: 0, label: 'Mới tạo' },
        { id: 1, label: 'Đã thanh toán' },

        { id: 2, label: 'Đã hủy' },
        { id: 3, label: 'Thanh toán một phần' },
    ];

    const handleOrderStatus = (order_status: number) => {
        switch(order_status){
            case 0:
                return <Text style={[styles.orderStatusText, {color: '#007AFF', fontWeight: 'bold'}]}>Mới tạo</Text>
            case 1:
                return <Text style={[styles.orderStatusText, {color: '#28A745', fontWeight: 'bold'}]}>Đã thanh toán</Text>
            case 2:
                return <Text style={[styles.orderStatusText, {color: '#FF0000', fontWeight: 'bold'}]}>Đã hủy</Text>
            case 3:
                return <Text style={[styles.orderStatusText, {color: '#FF0000', fontWeight: 'bold'}]}>Thanh toán một phần</Text>
        }
    }

    const fetchOrderDetails = async () => {
        try {
            const response = await fetch(`https://huelinh.com/api/get_order_detail/${id}`);
            const data = await response.json();
            setOrderDetails(data);
            if (data.length > 0) {
                setEditStatus(data[0].status);
                setEditNote(data[0].note || '');
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể tải thông tin đơn hàng');
        } finally {
            setIsLoading(false);
        }

    };

    const handleUpdateOrder = async () => {
        try {
            setIsLoading(true);
            const formData = new FormData();
            formData.append('status', editStatus);
            formData.append('note', editNote);
            formData.append('user_id', '1');
            formData.append('paid_amount', editPaid);
            const response = await fetch(`https://huelinh.com/api/update_order/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });
            
            if (response.ok) {
                Alert.alert('Thành công', 'Đơn hàng đã được cập nhật');
                fetchOrderDetails();
            } else {
                Alert.alert('Lỗi', 'Không thể cập nhật đơn hàng');
            }

        } catch (error) {
            Alert.alert('Lỗi', 'Không thể cập nhật đơn hàng');
        } finally {
            setIsLoading(false);
        }

    };

    

    useEffect(() => {
        fetchOrderDetails();
    }, [id]);

    useEffect(() => {
        const loadAuth = async () => {
            const userId = await SecureStore.getItemAsync('userId');
            const role = await SecureStore.getItemAsync('role');
            setUserId(userId || '0');
            setRole(role || '0');
        };
        loadAuth();

    }, []);


    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Đang tải thông tin đơn hàng...</Text>
            </View>
        );
    }

    return (
        <LinearGradient
            colors={['#667eea', '#764ba2', '#f093fb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <View style={styles.container}>
                <HeaderNav currentScreen="Chi tiết đơn hàng" />
                
                {orderDetails.length > 0 && (
                    <ScrollView style={styles.content}>
                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.orderHeader}
                        >
                            <View style={styles.orderTitleContainer}>
                                <Text style={styles.orderTitle}>Đơn hàng #{orderDetails[0].order_id}</Text>
                                {(orderDetails[0].status !== '2' && orderDetails[0].seller == userId || role == 'admin') && (
                                <TouchableOpacity 
                                    style={styles.editButton}
                                    onPress={() => setIsModalVisible(true)}
                                >
                                    <LinearGradient
                                        colors={['#667eea', '#764ba2']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.editButtonGradient}
                                    >
                                        <AntDesign name="edit" size={20} color="white" />
                                    </LinearGradient>
                                </TouchableOpacity>
                                )}
                            </View>
                            <TouchableOpacity 
                                style={styles.orderStatus}
                                onPress={() => {
                                    if(orderDetails[0].status !== '2' && orderDetails[0].seller == userId || role == 'admin'){
                                        setIsModalVisible(true)
                                    }
                                }}
                            >
                                <Text style={styles.label}>Trạng thái: </Text>
                                {handleOrderStatus(parseInt(orderDetails[0].status))}
                            </TouchableOpacity>
                            <View style={styles.orderDate}>
                                <Text style={styles.label}>Ngày tạo: </Text>
                                <Text style={styles.orderDateText}>
                                    {formatDateTime(orderDetails[0].ie_date)}
                                </Text>
                            </View>
                            <View style={styles.orderDate}>
                                <Text style={styles.label}>Người bán: </Text>
                                <Text style={styles.orderDateText}>{orderDetails[0].fullname} ({orderDetails[0].username})</Text>
                            </View>
                        </LinearGradient>

                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.section}
                        >
                            <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
                            <View style={styles.customerInfo}>
                                <Text style={styles.customerName}>{orderDetails[0].customer_name}</Text>
                                <Text style={styles.customerPhone}>{orderDetails[0].phone_number}</Text>
                            </View>
                            <View>
                                <Text style={styles.customerPhone}>{orderDetails[0].other_info}</Text>
                            </View>
                        </LinearGradient>

                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.section}
                        >
                            <Text style={styles.sectionTitle}>Danh sách sản phẩm</Text>
                            {orderDetails.map((product, index) => (
                                <View key={index} style={[styles.productItem, {borderBottomWidth: index === orderDetails.length - 1 ? 0 : 1, borderBottomColor: 'rgba(0, 0, 0, 0.1)', paddingBottom: index === orderDetails.length - 1 ? 0 : 15, marginBottom: index === orderDetails.length - 1 ? 0 : 15}]}>
                                    <Image 
                                        source={{ uri: productImageSrc + product.ava.asset_src }} 
                                        style={styles.productImage} 
                                        contentFit="cover"
                                        cachePolicy="disk"
                                    />
                                    <View style={styles.productInfo}>
                                        <Text style={styles.productName}>{product.product_name}</Text>
                                        <Text style={styles.productBrand}>{product.brand_name}</Text>
                                        <Text style={styles.productBrand}>
                                            Giá gốc: {Number(product.price_current).toLocaleString()}đ
                                        </Text>
                                        <Text style={styles.productPrice}>
                                            {Number(product.order_price).toLocaleString()}đ
                                        </Text>
                                        <Text style={styles.productQuantity}>
                                            Số lượng: {product.order_quantity}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </LinearGradient>
                        {orderDetails[0].discount != '0' && (
                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.section}
                        >
                            <Text style={styles.sectionTitle}>Chiết khấu</Text>
                            <Text style={styles.note}>
                                {formatPrice(orderDetails[0].discount)}
                            </Text>
                        </LinearGradient>
                        )}
                        {orderDetails[0].note && (
                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.section}
                        >
                            <Text style={styles.sectionTitle}>Ghi chú</Text>
                            <Text style={styles.note}>
                                {orderDetails[0].note}
                            </Text>
                        </LinearGradient>
                        )}
                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.section}
                        >
                            <Text style={styles.sectionTitle}>Tổng tiền</Text>
                            <Text style={styles.totalPrice}>
                                {Number(orderDetails[0].total_price).toLocaleString()}đ
                            </Text>
                        </LinearGradient>
                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.section}
                        >
                            <Text style={styles.sectionTitle}>Lịch sử thanh toán</Text>
                            {orderDetails[0].history && orderDetails[0].history.length > 0 ? (
                                orderDetails[0].history.map((payment, index) => (
                                    <View key={payment.payment_id} style={[
                                        styles.paymentItem,
                                        index !== orderDetails[0].history!.length - 1 && styles.paymentItemBorder
                                    ]}>
                                        <View style={styles.paymentHeader}>
                                            <Text style={styles.paymentDate}>
                                                {formatDateTime(payment.created_date)}
                                            </Text>
                                            <Text style={styles.paymentAmount}>
                                                {(payment.notification_body.split(":")[1].slice(0, -1))}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.noPayments}>
                                    Chưa có lịch sử thanh toán
                                </Text>
                            )}
                        </LinearGradient>
                    </ScrollView>
                )}

                <Modal
                    visible={isModalVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setIsModalVisible(false)}
                >
                    <LinearGradient
                        colors={['rgba(102, 126, 234, 0.9)', 'rgba(118, 75, 162, 0.9)', 'rgba(240, 147, 251, 0.9)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.modalBackground}
                    >
                        <KeyboardAvoidingView 
                            behavior={Platform.OS === "ios" ? "padding" : "height"}
                            style={styles.modalOverlay}
                        >
                            <TouchableOpacity 
                                style={styles.modalOverlay} 
                                activeOpacity={1} 
                                onPress={() => setIsModalVisible(false)}
                            >
                                <TouchableOpacity 
                                    activeOpacity={1} 
                                    onPress={e => e.stopPropagation()}
                                >
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.modalContent}
                                    >
                                        <View style={styles.modalHeader}>
                                            <Text style={styles.modalTitle}>Cập nhật đơn hàng #{orderDetails[0]?.order_id}</Text>
                                            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                                <AntDesign name="close" size={24} color="black" />
                                            </TouchableOpacity>
                                        </View>
                                        
                                        <ScrollView style={styles.modalBody}>
                                            <Text style={styles.inputLabel}>Trạng thái:</Text>
                                            <DropDownPicker
                                                open={openStatus}
                                                setOpen={setOpenStatus}
                                                value={editStatus}
                                                setValue={(callback) => setEditStatus(callback(''))}
                                                items={orderStatuses.map(status => ({
                                                    label: status.label,
                                                    value: status.id.toString()
                                                }))}
                                                style={styles.dropdownStyle}
                                                dropDownContainerStyle={styles.dropdownContainer}
                                                placeholder="Chọn trạng thái"
                                            />
                                            {editStatus == '3' && (
                                                <View style={styles.modalSection}>
                                                    <Text style={styles.inputLabel}>Đã thanh toán:</Text>
                                                    <View style={styles.inputGroup}>
                                                        <TextInput
                                                            style={styles.partialInput}
                                                            value={editDisplayPaid}
                                                            onChangeText={(text) => {
                                                                const numericValue = text.replace(/[^0-9]/g, '');
                                                                setEditPaid(numericValue);
                                                                setEditDisplayPaid(formatPrice(numericValue));
                                                                if (Number(numericValue) === Number(orderDetails[0].total_price)) {
                                                                    setEditStatus('1');
                                                                } else if (Number(numericValue) > 0) {
                                                                    setEditStatus('3');
                                                                }
                                                            }}
                                                            keyboardType="numeric"
                                                            placeholder="Nhập số tiền đã thanh toán"
                                                        />
                                                        <View style={styles.totalPriceContainer}>
                                                            <Text style={styles.totalPriceModal}>
                                                                Tổng: {Number(orderDetails[0].total_price).toLocaleString()}đ
                                                            </Text>
                                                            <Text style={styles.totalPriceModal}>
                                                                Đã trả: {Number(orderDetails[0].paid_amount).toLocaleString()}đ
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            )}
                                            <Text style={styles.inputLabel}>Ghi chú:</Text>
                                            <TextInput
                                                style={styles.noteInput}
                                                value={editNote}
                                                onChangeText={setEditNote}
                                                multiline
                                                numberOfLines={4}
                                                placeholder="Nhập ghi chú"
                                            />
                                        </ScrollView>
                                        
                                        <View style={styles.modalActions}>
                                            <TouchableOpacity 
                                                style={[styles.modalButton, styles.cancelButton]}
                                                onPress={() => setIsModalVisible(false)}
                                            >
                                                <LinearGradient
                                                    colors={['#6b7280', '#4b5563']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={styles.modalButtonGradient}
                                                >
                                                    <Text style={styles.buttonText}>Hủy</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                style={[styles.modalButton, styles.saveButton]}
                                                onPress={() => {
                                                    handleUpdateOrder();
                                                    setIsModalVisible(false);
                                                }}
                                            >
                                                <LinearGradient
                                                    colors={['#10b981', '#059669']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={styles.modalButtonGradient}
                                                >
                                                    <Text style={[styles.buttonText, styles.saveButtonText]}>Lưu</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        </KeyboardAvoidingView>
                    </LinearGradient>
                </Modal>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
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
    orderHeader: {
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
    },
    orderTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 15,
    },
    orderStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    orderStatusText: {
        fontSize: 16,
        marginLeft: 20,
        color: '#374151',
        fontWeight: '500',
    },
    section: {
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 15,
        color: '#374151',
    },
    customerInfo: {
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
        paddingBottom: 10,
    },
    customerName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 5,
        color: '#374151',
    },
    customerPhone: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    productItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    productImage: {
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
    productInfo: {
        marginLeft: 15,
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 5,
        color: '#374151',
    },
    productBrand: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 5,
        fontWeight: '500',
    },
    productPrice: {
        fontSize: 16,
        color: '#10b981',
        fontWeight: '600',
    },
    updateForm: {
        gap: 10,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        width: 80,
        color: '#374151',
    },
    dropdownStyle: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 1,
        borderRadius: 12,
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
    noteInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 12,
        padding: 15,
        height: 100,
        textAlignVertical: 'top',
        marginBottom: 15,
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
    updateButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    updateButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    totalPrice: {
        fontSize: 24,
        color: '#10b981',
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#374151',
    },
    modalBody: {
        flexGrow: 0,
        maxHeight: '80%',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        marginTop: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.1)',
    },
    modalButton: {
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        minWidth: 120,
    },
    modalButtonGradient: {
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        minWidth: 120,
    },
    cancelButton: {
        // Gradient handled by LinearGradient
    },
    saveButton: {
        // Gradient handled by LinearGradient
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButtonText: {
        fontWeight: 'bold',
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#374151',
    },
    note: {
        fontSize: 15,
        marginTop: 5,
        color: '#6b7280',
        fontWeight: '500',
    },
    orderDate: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    orderDateText: {
        fontSize: 14,
        marginLeft: 20,
        color: '#6b7280',
        fontWeight: '500',
    },
    orderTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    productQuantity: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 5,
        fontWeight: '500',
    },
    paymentItem: {
        padding: 15,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    paymentItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
        paddingBottom: 15,
    },
    paymentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    paymentMethod: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
    },
    paymentAmount: {
        fontSize: 16,
        color: '#10b981',
        fontWeight: '600',
    },
    paymentDate: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
    },
    paymentNote: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 5,
        fontStyle: 'italic',
    },
    noPayments: {
        fontSize: 14,
        color: '#6b7280',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 10,
        fontWeight: '500',
    },
    modalSection: {
        marginBottom: 20,
    },
    inputGroup: {
        gap: 8,
    },
    partialInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 12,
        padding: 15,
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
    totalPriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    totalPriceModal: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
        fontWeight: '500',
    },
    editButton: {
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    editButtonGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
