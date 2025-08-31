import HeaderNav from '@/app/components/headerNav';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

interface DetailReport {
    data: {
        current_report: string;
        start_date: string;
        end_date: string;
        orders: Array<{
            order_id: string;
            total_price: string;
            status: string;
            seller: string;
            fullname: string;
            created_date: string;
            discount: string;
        }>;
        total_spent: number;
        total_remain_products: number;
        total_float_products: number;
        count_product: number;
        checkin: Array<{
            user_id: string;
            fullname: string;
            data: Array<{
                checkin_date: string;
                checkin_time: string;
                user_id: string;
                fullname: string;
            }>;
        }>;
    };
}

interface EmployeeStats {
    [key: string]: {
        name: string;
        totalOrders: number;
        totalSales: number;
        checkinDays: number;
        totalDays: number;
    };
}

const screenWidth = Dimensions.get("window").width;

// Add these colors for the pie chart
const CHART_COLORS = ['#1abc9c', '#3498db', '#9b59b6', '#e67e22', '#e74c3c', '#2ecc71', '#f1c40f'];

export default function DetailReportScreen() {
    const { id } = useLocalSearchParams();
    const [report, setReport] = useState<DetailReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [store, setStore] = useState('');
    const [total_spent, setTotalSpent] = useState(0);
    const [employeeStats, setEmployeeStats] = useState<EmployeeStats>({});

    useEffect(() => {
        fetchReportDetails();
    }, [id]);

    useEffect(() => {
        if (report) {
            const stats = calculateEmployeeStats(report.data.orders, report.data.checkin, report.data.current_report);
            setEmployeeStats(stats);
        }
    }, [report]);

    const fetchReportDetails = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`https://huelinh.com/api/get_report/${id}`);
            const data = await response.json();
            setReport(data);
            var total_spent = 0;
            data.data.orders.forEach((order: any) => {
                
                if (order.status === '1') {
                    total_spent += parseInt(order.total_price);
                }
            });
            setTotalSpent(total_spent);
        } catch (err) {
            setError('Không thể tải báo cáo. Vui lòng thử lại sau.');
        } finally {
            setIsLoading(false);
        }
    };

    const calculateOrderStats = (orders: DetailReport['data']['orders']) => {
        const stats = {
            processing: orders.filter(order => order.status === '0').length,
            completed: orders.filter(order => order.status === '1').length,
            cancelled: orders.filter(order => order.status === '2').length,
            total: orders.length
        };
        return stats;
    };

    const getDaysInMonth = (dateString: string) => {
        const [month, year] = dateString.split('-');
        return new Date(parseInt(year), parseInt(month), 0).getDate();
    };

    const calculateEmployeeStats = (orders: DetailReport['data']['orders'], checkins: DetailReport['data']['checkin'], currentReport: string): EmployeeStats => {
        
        const stats: EmployeeStats = {};
        const totalDaysInMonth = getDaysInMonth(currentReport);
        
        // Initialize stats for all employees with check-ins
        checkins.forEach(employee => {
            if (!stats[employee.user_id]) {
                stats[employee.user_id] = {
                    name: employee.fullname,
                    totalOrders: 0,
                    totalSales: 0,
                    checkinDays: 0,
                    totalDays: totalDaysInMonth
                };
            }
            // Count unique checkin days
            const uniqueDays = new Set(employee.data.map(check => check.checkin_date));
            stats[employee.user_id].checkinDays = uniqueDays.size;
        });

        // Process orders
        interface User19Order {
            id: string;
            price: number;
        }
        const user19Orders: User19Order[] = [];
        
        orders.forEach(order => {
            if (!stats[order.seller]) {
                stats[order.seller] = {
                    name: order.fullname,
                    totalOrders: 0,
                    totalSales: 0,
                    checkinDays: 0,
                    totalDays: totalDaysInMonth
                };
            }
            if (order.status === '1') { // Only count completed orders
                stats[order.seller].totalOrders++;
                stats[order.seller].totalSales += parseInt(order.total_price);
                
                if(order.seller === "19") {
                    user19Orders.push({
                        id: order.order_id,
                        price: parseInt(order.total_price)
                    });
                }
            }
        });
        
        if (stats["19"]) {
            console.log("Detail Report - User 19 Stats:");
            console.log("Total orders:", user19Orders.length);
            // Sort orders by price for easier comparison
            user19Orders.sort((a, b) => b.price - a.price);
            user19Orders.forEach(order => {
                console.log(`Order #${order.id}: ${order.price.toLocaleString('de-DE')}đ`);
            });
            console.log("Total sales:", stats["19"].totalSales.toLocaleString('de-DE'));
        }
        
        return stats;
    };

    if (isLoading) {
        return (
            <LinearGradient
                colors={['#667eea', '#764ba2', '#f093fb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.container}
            >
                <HeaderNav currentScreen="Chi tiết báo cáo" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
                </View>
            </LinearGradient>
        );
    }

    if (error) {
        return (
            <LinearGradient
                colors={['#667eea', '#764ba2', '#f093fb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.container}
            >
                <HeaderNav currentScreen="Chi tiết báo cáo" />
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            </LinearGradient>
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
                <HeaderNav currentScreen="Chi tiết báo cáo" />
                
                {report && (
                    <ScrollView style={styles.content}>
                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.orderHeader}
                        >
                            <View style={styles.orderTitleContainer}>
                                <Text style={styles.orderTitle}>
                                    Báo cáo tháng {report.data.current_report}
                                </Text>
                            </View>
                        </LinearGradient>

                        <View
                            style={styles.section}
                        >
                            <Text style={styles.sectionTitle}>Thống kê đơn hàng</Text>
                            <View style={styles.statisticRows}>
                                <View style={styles.statisticRow}>
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.8)']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.statisticItem}
                                    >
                                        <MaterialIcons name="shopping-cart" size={24} color="#007AFF" />
                                        <Text style={styles.statisticValue}>
                                            {calculateOrderStats(report.data.orders).total}
                                        </Text>
                                        <Text style={styles.statisticLabel}>Tổng đơn</Text>
                                    </LinearGradient>
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.8)']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.statisticItem}
                                    >
                                        <MaterialIcons name="check-circle" size={24} color="#28A745" />
                                        <Text style={styles.statisticValue}>
                                            {calculateOrderStats(report.data.orders).completed}
                                        </Text>
                                        <Text style={styles.statisticLabel}>Thành công</Text>
                                    </LinearGradient>
                                </View>
                                <View style={styles.statisticRow}>
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.8)']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.statisticItem}
                                    >
                                        <MaterialIcons name="hourglass-empty" size={24} color="#FFC107" />
                                        <Text style={styles.statisticValue}>
                                            {calculateOrderStats(report.data.orders).processing}
                                        </Text>
                                        <Text style={styles.statisticLabel}>Đang xử lý</Text>
                                    </LinearGradient>
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.8)']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.statisticItem}
                                    >
                                        <MaterialIcons name="cancel" size={24} color="#DC3545" />
                                        <Text style={styles.statisticValue}>
                                            {calculateOrderStats(report.data.orders).cancelled}
                                        </Text>
                                        <Text style={styles.statisticLabel}>Đã hủy</Text>
                                    </LinearGradient>
                                </View>
                            </View>
                        </View>

                        <View
                            style={styles.section}
                        >
                            <Text style={styles.sectionTitle}>Kho hàng</Text>
                            <View style={styles.statisticRows}>
                                <View style={styles.statisticRow}>
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.8)']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.statisticItem}
                                    >
                                        <MaterialIcons name="inventory" size={24} color="#8e44ad" />
                                        <Text style={styles.statisticValue}>
                                            {report.data.total_remain_products}
                                        </Text>
                                        <Text style={styles.statisticLabel}>Trong kho</Text>
                                    </LinearGradient>
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.8)']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.statisticItem}
                                    >
                                        <MaterialIcons name="store" size={24} color="#1abc9c" />
                                        <Text style={styles.statisticValue}>
                                            {report.data.total_float_products}
                                        </Text>
                                        <Text style={styles.statisticLabel}>Kí gửi</Text>
                                    </LinearGradient>
                                </View>
                                <View style={styles.statisticRow}>
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.8)']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={[styles.statisticItem, styles.fullWidthItem]}
                                    >
                                        <MaterialIcons name="attach-money" size={24} color="#28A745" />
                                        <Text style={styles.statisticValue}>
                                            {total_spent.toLocaleString('de-DE')}đ
                                        </Text>
                                        <Text style={styles.statisticLabel}>Doanh thu</Text>
                                    </LinearGradient>
                                </View>
                            </View>
                        </View>

                        <View
                            style={styles.section}
                        >
                            <Text style={styles.sectionTitle}>Thống kê nhân viên</Text>
                            
                            {Object.entries(employeeStats).length > 0 && (
                                <LinearGradient
                                    colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.8)']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.pieChartContainer}
                                >
                                    <View style={styles.pieChartWrapper}>
                                        <PieChart
                                            data={Object.entries(employeeStats)
                                                .map(([id, stats], index) => {
                                                    const percentage = report.data.total_spent > 0 
                                                        ? ((stats.totalSales / report.data.total_spent) * 100).toFixed(1) 
                                                        : '0';
                                                    return {
                                                        name: stats.name,
                                                        sales: stats.totalSales || 1,
                                                        color: CHART_COLORS[index % CHART_COLORS.length],
                                                        legendFontColor: '#666',
                                                        legendFontSize: 12,
                                                        labelComponent: parseFloat(percentage) >= 15 ? () => (
                                                            <Text style={{ 
                                                                color: '#fff', 
                                                                fontSize: 12, 
                                                                fontWeight: 'bold' 
                                                            }}>
                                                                {percentage}%
                                                            </Text>
                                                        ) : undefined
                                                    };
                                                })}
                                            width={screenWidth - 80}
                                            height={180}
                                            chartConfig={{
                                                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                            }}
                                            accessor="sales"
                                            backgroundColor="transparent"
                                            paddingLeft="15"
                                            absolute
                                            hasLegend={false}
                                            center={[(screenWidth - 80) / 4, 0]}
                                        />
                                    </View>
                                    <View style={styles.pieChartLegend}>
                                        {Object.entries(employeeStats)
                                            .map(([id, stats], index) => (
                                                <View key={id} style={styles.legendItem}>
                                                    <View style={[styles.legendColor, { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }]} />
                                                    <Text style={styles.legendText}>
                                                        {stats.name} ({total_spent > 0 ? ((stats.totalSales / total_spent) * 100).toFixed(1) : '0'}%)
                                                    </Text>
                                                </View>
                                            ))}
                                    </View>
                                </LinearGradient>
                            )}

                            {/* Existing employee cards */}
                            {Object.entries(employeeStats).map(([id, stats]) => (
                                <LinearGradient
                                    key={id}
                                    colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.8)']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.employeeItem}
                                >
                                    <Text style={styles.employeeName}>{stats.name}</Text>
                                    <View style={styles.employeeStats}>
                                        <View style={styles.employeeStatRow}>
                                            <View style={styles.employeeStatItem}>
                                                <MaterialIcons name="check-circle" size={20} color="#28A745" />
                                                <Text style={styles.employeeStatText}>
                                                    Đơn thành công: {stats.totalOrders}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.employeeStatRow}>
                                            <View style={styles.employeeStatItem}>
                                                <MaterialIcons name="attach-money" size={20} color="#1976D2" />
                                                <Text style={styles.employeeStatText}>
                                                    Doanh số: {stats.totalSales.toLocaleString('de-DE')}đ
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.employeeStatRow}>
                                            <View style={styles.employeeStatItem}>
                                                <MaterialIcons name="event-available" size={20} color="#8e44ad" />
                                                <Text style={styles.employeeStatText}>
                                                    Số ngày làm việc: {stats.checkinDays}/{stats.totalDays}
                                                </Text>
                                                <View style={styles.progressBar}>
                                                    <View 
                                                        style={[
                                                            styles.progressFill, 
                                                            { width: `${(stats.checkinDays / stats.totalDays) * 100}%` }
                                                        ]} 
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </LinearGradient>
                            ))}
                        </View>
                    </ScrollView>
                )}
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 25,
    },
    orderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
    },
    orderTitleContainer: {
        flex: 1,
    },
    orderTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    orderDate: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        color: '#666',
    },
    orderDateText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 10,
    },
    section: {
        marginBottom: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 15,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    statisticRows: {
        gap: 12,
    },
    statisticRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statisticItem: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    statisticValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1976D2',
        marginVertical: 6,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    statisticLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    employeeItem: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    employeeName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
        paddingBottom: 8,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    employeeStats: {
        gap: 8,
    },
    employeeStatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    employeeStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    employeeStatText: {
        fontSize: 14,
        color: '#666',
        flex: 1,
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#ffffff',
        marginTop: 10,
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: '#ffffff',
        fontSize: 16,
        textAlign: 'center',
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    fullWidthItem: {
        flex: 1,
        paddingVertical: 20,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        overflow: 'hidden',
        width: 60,
        marginLeft: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#8e44ad',
        borderRadius: 2,
    },
    pieChartContainer: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
    },
    pieChartWrapper: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -15, // Compensate for chart padding
    },
    pieChartLegend: {
        marginTop: 16,
        width: '100%',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        paddingHorizontal: 10,
    },
    legendColor: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    legendText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
});
