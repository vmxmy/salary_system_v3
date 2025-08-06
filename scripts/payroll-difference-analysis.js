#!/usr/bin/env node

/**
 * 薪资差异分析脚本
 * 功能：对比新老系统中应发合计和扣发合计金额差异的员工
 * 使用：node payroll-difference-analysis.js <薪资周期>
 * 示例：node payroll-difference-analysis.js 2025-01
 */

// 老系统数据 (从PostgreSQL查询结果)
const oldSystemData = [
  { name: "何婷", id: "510102197110271064", gross: 15941.00, deductions: 5160.61, net: 10780.39 },
  { name: "冉光俊", id: "510103197309155710", gross: 25732.00, deductions: 7723.91, net: 18008.09 },
  { name: "刘丹", id: "513101198306270320", gross: 17316.00, deductions: 4914.94, net: 12401.06 },
  { name: "刘嘉", id: "51010419790927236X", gross: 12990.00, deductions: 4217.04, net: 8772.96 },
  { name: "包晓静", id: "51010719800901262X", gross: 15279.00, deductions: 4598.02, net: 10680.98 },
  { name: "卢妍如", id: "51162219951030004X", gross: 6462.00, deductions: 1448.05, net: 5013.95 },
  { name: "吕果", id: "510107197509030897", gross: 13619.00, deductions: 4366.66, net: 9252.34 },
  { name: "周宏伟", id: "429006198705292113", gross: 14155.00, deductions: 4479.17, net: 9675.83 },
  { name: "周雪莲", id: "511323198111206326", gross: 17577.00, deductions: 5279.64, net: 12297.36 },
  { name: "唐国晋", id: "511381199708288596", gross: 12779.00, deductions: 4335.59, net: 8443.41 },
  { name: "宋方圆", id: "510321198809260048", gross: 8880.00, deductions: 2620.49, net: 6259.51 },
  { name: "廖希", id: "510113198101150029", gross: 15279.00, deductions: 4660.23, net: 10618.77 },
  { name: "张净", id: "511302198809010737", gross: 12800.00, deductions: 5615.45, net: 7184.55 },
  { name: "张玲", id: "510124197803210027", gross: 14530.00, deductions: 4908.41, net: 9621.59 },
  { name: "张磊", id: "511111198901171715", gross: 15897.00, deductions: 5250.54, net: 10646.46 },
  { name: "张福祥", id: "230621199504160058", gross: 12672.00, deductions: 2575.20, net: 10096.80 },
  { name: "张练", id: "511527198411210024", gross: 15100.00, deductions: 5363.72, net: 9736.28 },
  { name: "徐云祥", id: "510122197604122873", gross: 8880.00, deductions: 3100.36, net: 5779.64 },
  { name: "徐颖", id: "510322198312070042", gross: 10185.00, deductions: 2620.49, net: 7564.51 },
  { name: "方敬玉", id: "510102196903083202", gross: 17566.00, deductions: 5594.36, net: 11971.64 },
  { name: "李佳", id: "511381199005110265", gross: 8038.00, deductions: 1383.55, net: 6654.45 },
  { name: "李庆", id: "510107197706032170", gross: 18819.00, deductions: 6696.32, net: 12122.68 },
  { name: "李文媛", id: "370902197908020026", gross: 17492.00, deductions: 5594.07, net: 11897.93 },
  { name: "李汶卿", id: "620503199907198039", gross: 9344.00, deductions: 2520.35, net: 6823.65 },
  { name: "李薇", id: "510212197210121627", gross: 15936.00, deductions: 5073.71, net: 10862.29 },
  { name: "杜疆", id: "510105197804032526", gross: 14530.00, deductions: 4728.23, net: 9801.77 },
  { name: "杨勤文", id: "510104198207264060", gross: 14085.00, deductions: 4580.59, net: 9504.41 },
  { name: "杨圣", id: "51032119921205801X", gross: 12300.00, deductions: 4521.17, net: 7778.83 },
  { name: "杨洋", id: "510106197512164128", gross: 15725.00, deductions: 5003.39, net: 10721.61 },
  { name: "杨钰婕", id: "511102199707145925", gross: 12672.00, deductions: 2620.20, net: 10051.80 },
  { name: "江慧", id: "513823198406075828", gross: 8038.00, deductions: 2958.42, net: 5079.58 },
  { name: "汪琳", id: "510103197108310040", gross: 20724.00, deductions: 6662.87, net: 14061.13 },
  { name: "沈丽萍", id: "512501197304092141", gross: 14010.00, deductions: 4728.45, net: 9281.55 },
  { name: "熊静", id: "510102197005034083", gross: 21425.00, deductions: 8070.59, net: 13354.41 },
  { name: "田原", id: "513030199904070047", gross: 13222.00, deductions: 2832.75, net: 10389.25 },
  { name: "罗蓉", id: "510106197511143528", gross: 15597.00, deductions: 4906.65, net: 10690.35 },
  { name: "胡潇", id: "511113199412223323", gross: 13509.00, deductions: 4086.03, net: 9422.97 },
  { name: "胡艺山", id: "510522198903201295", gross: 14059.00, deductions: 5114.88, net: 8944.12 },
  { name: "蒲薇", id: "510104198105140665", gross: 15279.00, deductions: 4596.49, net: 10682.51 },
  { name: "谢欣然", id: "510902198205169343", gross: 8880.00, deductions: 3145.16, net: 5734.84 },
  { name: "谷颖", id: "512528197506224093", gross: 21760.00, deductions: 8189.18, net: 13570.82 },
  { name: "赖梅", id: "510103197305160707", gross: 12962.00, deductions: 3810.82, net: 9151.18 },
  { name: "邱高长青", id: "511524199204180024", gross: 14883.00, deductions: 4681.14, net: 10201.86 },
  { name: "阮永强", id: "510103197106306216", gross: 10641.00, deductions: 3214.15, net: 7426.85 },
  { name: "阴琪", id: "650300197206205423", gross: 17500.00, deductions: 6395.85, net: 11104.15 },
  { name: "陈敏", id: "510104198109290281", gross: 10185.00, deductions: 3098.53, net: 7086.47 },
  { name: "韩霜", id: "511002197402181525", gross: 20488.00, deductions: 6744.90, net: 13743.10 },
  { name: "马霜", id: "511302198612070349", gross: 14996.00, deductions: 4324.12, net: 10671.88 },
  { name: "高洪艳", id: "510103197106094225", gross: 17990.00, deductions: 6757.84, net: 11232.16 },
  { name: "黄卓尔", id: "513101199605060045", gross: 6546.00, deductions: 1364.47, net: 5181.53 },
  { name: "黄明", id: "513401196804180245", gross: 22490.00, deductions: 7566.58, net: 14923.42 }
];

// 新系统数据 (从Supabase查询结果)
const newSystemData = [
  { name: "何婷", id: "510102197110271064", gross: 26827.00, deductions: 5160.61, net: 21666.39 },
  { name: "冉光俊", id: "510103197309155710", gross: 42999.00, deductions: 7723.91, net: 35275.09 },
  { name: "刘丹", id: "513101198306270320", gross: 28667.00, deductions: 4914.94, net: 23752.06 },
  { name: "刘嘉", id: "51010419790927236X", gross: 12990.00, deductions: 4217.04, net: 8772.96 },
  { name: "包晓静", id: "51010719800901262X", gross: 25508.00, deductions: 4598.02, net: 20909.98 },
  { name: "卢妍如", id: "51162219951030004X", gross: 6462.00, deductions: 1448.05, net: 5013.95 },
  { name: "吕果", id: "510107197509030897", gross: 22783.00, deductions: 4366.66, net: 18416.34 },
  { name: "周宏伟", id: "429006198705292113", gross: 23480.00, deductions: 4479.17, net: 19000.83 },
  { name: "周雪莲", id: "511323198111206326", gross: 29194.00, deductions: 5279.64, net: 23914.36 },
  { name: "唐国晋", id: "511381199708288596", gross: 12779.00, deductions: 4335.59, net: 8443.41 },
  { name: "宋方圆", id: "510321198809260048", gross: 8880.00, deductions: 2620.49, net: 6259.51 },
  { name: "廖希", id: "510113198101150029", gross: 25508.00, deductions: 4660.23, net: 20847.77 },
  { name: "张净", id: "511302198809010737", gross: 21300.00, deductions: 5615.45, net: 15684.55 },
  { name: "张玲", id: "510124197803210027", gross: 14530.00, deductions: 4908.41, net: 9621.59 },
  { name: "张磊", id: "511111198901171715", gross: 15897.00, deductions: 5250.54, net: 10646.46 },
  { name: "张福祥", id: "230621199504160058", gross: 12672.00, deductions: 2575.20, net: 10096.80 },
  { name: "张练", id: "511527198411210024", gross: 25600.00, deductions: 5363.72, net: 20236.28 },
  { name: "徐云祥", id: "510122197604122873", gross: 8880.00, deductions: 3100.36, net: 5779.64 },
  { name: "徐颖", id: "510322198312070042", gross: 10185.00, deductions: 2620.49, net: 7564.51 },
  { name: "方敬玉", id: "510102196903083202", gross: 29652.00, deductions: 5594.36, net: 24057.64 },
  { name: "李佳", id: "511381199005110265", gross: 8038.00, deductions: 1383.55, net: 6654.45 },
  { name: "李庆", id: "510107197706032170", gross: 18819.00, deductions: 6696.32, net: 12122.68 },
  { name: "李文媛", id: "370902197908020026", gross: 29024.00, deductions: 5594.07, net: 23429.93 },
  { name: "李汶卿", id: "620503199907198039", gross: 9344.00, deductions: 2520.35, net: 6823.65 },
  { name: "李薇", id: "510212197210121627", gross: 26822.00, deductions: 5073.71, net: 21748.29 },
  { name: "杜疆", id: "510105197804032526", gross: 14530.00, deductions: 4728.23, net: 9801.77 },
  { name: "杨勤文", id: "510104198207264060", gross: 14085.00, deductions: 4580.59, net: 9504.41 },
  { name: "杨圣", id: "51032119921205801X", gross: 20900.00, deductions: 4521.17, net: 16378.83 },
  { name: "杨洋", id: "510106197512164128", gross: 15725.00, deductions: 5003.39, net: 10721.61 },
  { name: "杨钰婕", id: "511102199707145925", gross: 12672.00, deductions: 2620.20, net: 10051.80 },
  { name: "江慧", id: "513823198406075828", gross: 8038.00, deductions: 2958.42, net: 5079.58 },
  { name: "汪琳", id: "510103197108310040", gross: 20724.00, deductions: 6662.87, net: 14061.13 },
  { name: "沈丽萍", id: "512501197304092141", gross: 14010.00, deductions: 4728.45, net: 9281.55 },
  { name: "熊静", id: "510102197005034083", gross: 21425.00, deductions: 8070.59, net: 13354.41 },
  { name: "田原", id: "513030199904070047", gross: 13222.00, deductions: 2832.75, net: 10389.25 },
  { name: "罗蓉", id: "510106197511143528", gross: 15597.00, deductions: 4906.65, net: 10690.35 },
  { name: "胡潇", id: "511113199412223323", gross: 13509.00, deductions: 4086.03, net: 9422.97 },
  { name: "胡艺山", id: "510522198903201295", gross: 14059.00, deductions: 5114.88, net: 8944.12 },
  { name: "蒲薇", id: "510104198105140665", gross: 15279.00, deductions: 4596.49, net: 10682.51 },
  { name: "谢欣然", id: "510902198205169343", gross: 8880.00, deductions: 3145.16, net: 5734.84 },
  { name: "谷颖", id: "512528197506224093", gross: 21760.00, deductions: 8189.18, net: 13570.82 },
  { name: "赖梅", id: "510103197305160707", gross: 12962.00, deductions: 3810.82, net: 9151.18 },
  { name: "邱高长青", id: "511524199204180024", gross: 14883.00, deductions: 4681.14, net: 10201.86 },
  { name: "阮永强", id: "510103197106306216", gross: 10641.00, deductions: 3214.15, net: 7426.85 },
  { name: "阴琪", id: "650300197206205423", gross: 17500.00, deductions: 6395.85, net: 11104.15 },
  { name: "陈敏", id: "510104198109290281", gross: 10185.00, deductions: 3098.53, net: 7086.47 },
  { name: "韩霜", id: "511002197402181525", gross: 20488.00, deductions: 6744.90, net: 13743.10 },
  { name: "马霜", id: "511302198612070349", gross: 14996.00, deductions: 4324.12, net: 10671.88 },
  { name: "高洪艳", id: "510103197106094225", gross: 17990.00, deductions: 6757.84, net: 11232.16 },
  { name: "黄卓尔", id: "513101199605060045", gross: 6546.00, deductions: 1364.47, net: 5181.53 },
  { name: "黄明", id: "513401196804180245", gross: 22490.00, deductions: 7566.58, net: 14923.42 }
];

/**
 * 对比分析函数
 */
function analyzeDifferences() {
  console.log('🔍 2025-01 薪资差异分析报告');
  console.log('='.repeat(80));
  
  // 创建老系统数据映射
  const oldMap = {};
  oldSystemData.forEach(emp => {
    oldMap[emp.id] = emp;
  });
  
  // 创建新系统数据映射
  const newMap = {};
  newSystemData.forEach(emp => {
    newMap[emp.id] = emp;
  });
  
  // 找出差异员工
  const differences = [];
  
  // 遍历新系统数据，对比老系统
  newSystemData.forEach(newEmp => {
    const oldEmp = oldMap[newEmp.id];
    if (!oldEmp) {
      console.log(`⚠️  员工 ${newEmp.name} 在老系统中未找到`);
      return;
    }
    
    const grossDiff = newEmp.gross - oldEmp.gross;
    const deductionsDiff = newEmp.deductions - oldEmp.deductions;
    const netDiff = newEmp.net - oldEmp.net;
    
    // 如果应发或扣发有差异（容差0.01元）
    if (Math.abs(grossDiff) > 0.01 || Math.abs(deductionsDiff) > 0.01) {
      differences.push({
        name: newEmp.name,
        id: newEmp.id,
        old_gross: oldEmp.gross,
        new_gross: newEmp.gross,
        gross_diff: grossDiff,
        old_deductions: oldEmp.deductions,
        new_deductions: newEmp.deductions,
        deductions_diff: deductionsDiff,
        old_net: oldEmp.net,
        new_net: newEmp.net,
        net_diff: netDiff,
        gross_percentage: oldEmp.gross > 0 ? (grossDiff / oldEmp.gross * 100).toFixed(2) : 0,
        deductions_percentage: oldEmp.deductions > 0 ? (deductionsDiff / oldEmp.deductions * 100).toFixed(2) : 0
      });
    }
  });
  
  // 找出只在老系统中存在的员工
  const missingInNew = [];
  oldSystemData.forEach(oldEmp => {
    if (!newMap[oldEmp.id]) {
      missingInNew.push(oldEmp);
    }
  });
  
  console.log(`\n📊 统计结果:`);
  console.log(`老系统员工数: ${oldSystemData.length}`);
  console.log(`新系统员工数: ${newSystemData.length}`);
  console.log(`存在差异员工数: ${differences.length}`);
  console.log(`新系统缺失员工数: ${missingInNew.length}`);
  
  // 显示缺失员工
  if (missingInNew.length > 0) {
    console.log(`\n❌ 新系统中缺失的员工 (${missingInNew.length}人):`);
    console.log('='.repeat(80));
    missingInNew.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.name} (${emp.id})`);
      console.log(`   应发: ¥${emp.gross.toFixed(2)}, 扣发: ¥${emp.deductions.toFixed(2)}, 实发: ¥${emp.net.toFixed(2)}`);
    });
  }
  
  // 按应发差异金额排序，显示差异最大的员工
  if (differences.length > 0) {
    differences.sort((a, b) => Math.abs(b.gross_diff) - Math.abs(a.gross_diff));
    
    console.log(`\n💰 应发合计差异最大的员工 (前10名):`);
    console.log('='.repeat(80));
    differences.slice(0, 10).forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.name} (${emp.id})`);
      console.log(`   应发: ¥${emp.old_gross.toFixed(2)} → ¥${emp.new_gross.toFixed(2)} (差异: ${emp.gross_diff > 0 ? '+' : ''}¥${emp.gross_diff.toFixed(2)}, ${emp.gross_percentage}%)`);
      console.log(`   扣发: ¥${emp.old_deductions.toFixed(2)} → ¥${emp.new_deductions.toFixed(2)} (差异: ${emp.deductions_diff > 0 ? '+' : ''}¥${emp.deductions_diff.toFixed(2)}, ${emp.deductions_percentage}%)`);
      console.log(`   实发: ¥${emp.old_net.toFixed(2)} → ¥${emp.new_net.toFixed(2)} (差异: ${emp.net_diff > 0 ? '+' : ''}¥${emp.net_diff.toFixed(2)})`);
      console.log('');
    });
    
    // 统计应发差异总额
    const totalGrossDiff = differences.reduce((sum, emp) => sum + emp.gross_diff, 0);
    const totalDeductionsDiff = differences.reduce((sum, emp) => sum + emp.deductions_diff, 0);
    const totalNetDiff = differences.reduce((sum, emp) => sum + emp.net_diff, 0);
    
    console.log(`\n📈 差异汇总:`);
    console.log('='.repeat(80));
    console.log(`应发差异总额: ${totalGrossDiff > 0 ? '+' : ''}¥${totalGrossDiff.toFixed(2)}`);
    console.log(`扣发差异总额: ${totalDeductionsDiff > 0 ? '+' : ''}¥${totalDeductionsDiff.toFixed(2)}`);
    console.log(`实发差异总额: ${totalNetDiff > 0 ? '+' : ''}¥${totalNetDiff.toFixed(2)}`);
    
    // 分类统计
    const grossIncreases = differences.filter(emp => emp.gross_diff > 0);
    const grossDecreases = differences.filter(emp => emp.gross_diff < 0);
    
    console.log(`\n📊 差异分类:`);
    console.log(`应发增加员工: ${grossIncreases.length}人，增加总额: ¥${grossIncreases.reduce((sum, emp) => sum + emp.gross_diff, 0).toFixed(2)}`);
    console.log(`应发减少员工: ${grossDecreases.length}人，减少总额: ¥${Math.abs(grossDecreases.reduce((sum, emp) => sum + emp.gross_diff, 0)).toFixed(2)}`);
  }
  
  console.log('\n' + '='.repeat(80));
  
  return {
    totalDifferences: differences.length,
    missingEmployees: missingInNew.length,
    differences: differences
  };
}

// 运行分析
if (require.main === module) {
  analyzeDifferences();
}

module.exports = {
  analyzeDifferences,
  oldSystemData,
  newSystemData
};